use crate::database::DataBase;
use crate::services::upload::schema::{
    ChunkUploadResponse, FinalizeUploadResponse, Upload, UploadProgressResponse, UploadRequest,
    UploadResponse, UploadStatus,
};
use anyhow::{Result, anyhow};
use mongodb::bson::{DateTime, doc, oid::ObjectId, to_bson};
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use tokio::fs::{self, File};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

pub struct UploadService;

impl UploadService {
    const UPLOAD_DIR: &'static str = "uploads";
    const CHUNK_DIR: &'static str = "chunks";
    const MAX_FILE_SIZE: u64 = 5 * 1024 * 1024 * 1024; // 5GB
    const MIN_CHUNK_SIZE: u32 = 1024 * 1024; // 1MB
    const MAX_CHUNK_SIZE: u32 = 10 * 1024 * 1024; // 10MB
    const EXPIRE_HOURS: i64 = 24;

    pub async fn prepare(
        db: &DataBase,
        req: UploadRequest,
        uploader_id: Option<String>,
    ) -> Result<UploadResponse> {
        // 验证请求参数
        Self::validate(&req)?;

        // 检查文件是否已存在（秒传功能）
        if let Some(existing) = Self::find_completed(db, &req.file_hash).await? {
            return Ok(UploadResponse {
                upload_id: existing.id.unwrap().to_hex(),
                file_exists: true,
                uploaded_chunks: vec![],
                upload_url: "/api/v1/upload/chunk".to_string(),
            });
        }

        // 检查是否有未完成的上传任务
        if let Some(existing) =
            Self::find_pending(db, &req.file_hash, uploader_id.as_deref()).await?
        {
            return Ok(UploadResponse {
                upload_id: existing.id.unwrap().to_hex(),
                file_exists: false,
                uploaded_chunks: existing.uploaded_chunks,
                upload_url: "/api/v1/upload/chunk".to_string(),
            });
        }

        // 创建新的上传任务
        let upload = Self::build_record(req, uploader_id)?;
        let resp = db.uploads().insert_one(&upload).await?;
        let upload_id = resp.inserted_id.as_object_id().unwrap().to_hex();

        // 创建分片存储目录
        Self::prepare_chunk_dir(&upload_id).await?;

        Ok(UploadResponse {
            upload_id,
            file_exists: false,
            uploaded_chunks: vec![],
            upload_url: "/api/v1/upload/chunk".to_string(),
        })
    }

    pub async fn chunk(
        db: &DataBase,
        upload_id: &str,
        chunk_index: u32,
        chunk_data: Vec<u8>,
        chunk_hash: &str,
    ) -> Result<ChunkUploadResponse> {
        let upload = Self::find_by_id(db, upload_id).await?;

        // 验证上传状态
        Self::validate_status(&upload)?;

        // 验证分片参数
        Self::validate_chunk(&upload, chunk_index, &chunk_data, chunk_hash)?;

        // 检查分片是否已上传
        if upload.uploaded_chunks.contains(&chunk_index) {
            return Ok(ChunkUploadResponse {
                success: true,
                chunk_index,
                message: format!("Chunk {} already uploaded", chunk_index),
            });
        }

        // 保存分片
        Self::store_chunk(upload_id, chunk_index, &chunk_data).await?;

        // 更新上传进度 - 直接在数据库中添加分片索引
        Self::append_chunk(db, upload_id, chunk_index).await?;

        Ok(ChunkUploadResponse {
            success: true,
            chunk_index,
            message: format!("Chunk {} uploaded successfully", chunk_index),
        })
    }

    pub async fn finalize(db: &DataBase, upload_id: &str) -> Result<FinalizeUploadResponse> {
        println!("开始完成上传: upload_id = {}", upload_id);

        // 先同步文件系统和数据库的分片记录
        Self::sync_chunks(db, upload_id).await?;

        let upload = Self::find_by_id(db, upload_id).await?;
        println!("获取到上传记录: {:?}", upload);

        // 验证所有分片已上传
        Self::validate_completion(&upload)?;

        // 合并分片
        let final_path = Self::merge_chunks(&upload).await?;

        // 验证文件完整性
        Self::verify_integrity(&final_path, &upload.file_hash).await?;

        // 更新数据库记录
        Self::mark_completed(db, upload_id, &final_path).await?;

        // 清理临时文件
        Self::cleanup_chunks(upload_id).await?;

        let file_url = format!("/api/files/{}", upload.file_hash);

        Ok(FinalizeUploadResponse {
            success: true,
            file_url,
            file_id: upload_id.to_string(),
        })
    }

    pub async fn progress(db: &DataBase, upload_id: &str) -> Result<UploadProgressResponse> {
        let upload = Self::find_by_id(db, upload_id).await?;
        let progress = upload.uploaded_chunks.len() as f64 / upload.total_chunks as f64 * 100.0;

        Ok(UploadProgressResponse {
            upload_id: upload_id.to_string(),
            progress,
            uploaded_chunks: upload.uploaded_chunks,
            total_chunks: upload.total_chunks,
            status: upload.status,
        })
    }

    fn build_record(req: UploadRequest, uploader_id: Option<String>) -> Result<Upload> {
        let total_chunks = (req.file_size + req.chunk_size as u64 - 1) / req.chunk_size as u64;
        let now = DateTime::now();
        let expires_at =
            DateTime::from_millis(now.timestamp_millis() + Self::EXPIRE_HOURS * 60 * 60 * 1000);

        let upload = Upload {
            id: None,
            file_name: req.file_name,
            file_size: req.file_size,
            file_hash: req.file_hash,
            mime_type: req.mime_type,
            chunk_size: req.chunk_size,
            total_chunks: total_chunks as u32,
            uploaded_chunks: vec![],
            status: UploadStatus::Pending,
            storage_path: None,
            uploader_id: uploader_id
                .map(|id| ObjectId::parse_str(&id).ok())
                .flatten(),
            created_at: now,
            updated_at: now,
            expires_at: Some(expires_at),
        };

        Ok(upload)
    }

    pub async fn cancel(db: &DataBase, upload_id: &str) -> Result<()> {
        Self::mark_failed(db, upload_id).await?;
        Self::cleanup_chunks(upload_id).await?;

        Ok(())
    }

    fn validate(req: &UploadRequest) -> Result<()> {
        if req.file_size > Self::MAX_FILE_SIZE {
            return Err(anyhow!(
                "File size exceeds limit of {}GB",
                Self::MAX_FILE_SIZE / (1024 * 1024 * 1024)
            ));
        }

        if req.chunk_size < Self::MIN_CHUNK_SIZE || req.chunk_size > Self::MAX_CHUNK_SIZE {
            return Err(anyhow!(
                "Chunk size must be between {}MB and {}MB",
                Self::MIN_CHUNK_SIZE / (1024 * 1024),
                Self::MAX_CHUNK_SIZE / (1024 * 1024)
            ));
        }

        if req.file_name.trim().is_empty() {
            return Err(anyhow!("File name cannot be empty"));
        }

        if req.file_hash.len() != 64 {
            return Err(anyhow!("Invalid file hash format"));
        }

        Ok(())
    }

    fn validate_status(upload: &Upload) -> Result<()> {
        match upload.status {
            UploadStatus::Pending | UploadStatus::Uploading => Ok(()),
            UploadStatus::Completed => Err(anyhow!("Upload already completed")),
            UploadStatus::Failed => Err(anyhow!("Upload failed, cannot continue")),
            UploadStatus::Expired => Err(anyhow!("Upload expired")),
        }
    }

    fn validate_chunk(
        upload: &Upload,
        chunk_index: u32,
        chunk_data: &[u8],
        chunk_hash: &str,
    ) -> Result<()> {
        if chunk_index >= upload.total_chunks {
            return Err(anyhow!("Invalid chunk index: {}", chunk_index));
        }

        let calculated_hash = Self::calculate_hash(chunk_data);

        if calculated_hash != chunk_hash {
            return Err(anyhow!(
                "Chunk hash mismatch: expected {}, got {}",
                chunk_hash,
                calculated_hash
            ));
        }

        let expected_size = if chunk_index == upload.total_chunks - 1 {
            let remaining = upload.file_size % upload.chunk_size as u64;
            if remaining == 0 {
                upload.chunk_size as usize
            } else {
                remaining as usize
            }
        } else {
            upload.chunk_size as usize
        };

        if chunk_data.len() != expected_size {
            return Err(anyhow!(
                "Chunk size mismatch: expected {}, got {}",
                expected_size,
                chunk_data.len()
            ));
        }
        Ok(())
    }

    fn validate_completion(upload: &Upload) -> Result<()> {
        if upload.uploaded_chunks.len() != upload.total_chunks as usize {
            return Err(anyhow!(
                "Upload is not complete, missing chunks: {} of {}",
                upload.uploaded_chunks.len(),
                upload.total_chunks
            ));
        }

        let mut sorted_chunks = upload.uploaded_chunks.clone();
        sorted_chunks.sort();

        for (i, &chunk_index) in sorted_chunks.iter().enumerate() {
            if chunk_index != i as u32 {
                return Err(anyhow!(
                    "Missing chunk at index {}: expected {}, found {}",
                    i,
                    i,
                    chunk_index
                ));
            }
        }

        Ok(())
    }

    async fn find_completed(db: &DataBase, file_hash: &str) -> Result<Option<Upload>> {
        let upload = db
            .uploads()
            .find_one(doc! {
                "fileHash": file_hash,
                "status": UploadStatus::Completed.as_str()
            })
            .await?;
        Ok(upload)
    }

    async fn find_pending(
        db: &DataBase,
        file_hash: &str,
        uploader_id: Option<&str>,
    ) -> Result<Option<Upload>> {
        let mut filter = doc! {
            "fileHash": file_hash,
            "status": {
                "$in": [
                    UploadStatus::Pending.as_str(),
                    UploadStatus::Uploading.as_str()
                ]
            }
        };

        if let Some(uid) = uploader_id {
            if let Ok(object_id) = ObjectId::parse_str(uid) {
                filter.insert("uploaderId", object_id);
            }
        }

        let upload = db.uploads().find_one(filter).await?;
        Ok(upload)
    }

    async fn find_by_id(db: &DataBase, upload_id: &str) -> Result<Upload> {
        println!("查询上传记录: upload_id = {}", upload_id);
        let object_id = ObjectId::parse_str(upload_id)?;
        println!("解析的 ObjectId: {:?}", object_id);
        let upload = db
            .uploads()
            .find_one(doc! { "_id": object_id })
            .await?
            .ok_or_else(|| anyhow!("Upload not found"))?;

        println!("从数据库获取的上传记录: {:?}", upload);
        Ok(upload)
    }

    async fn prepare_chunk_dir(upload_id: &str) -> Result<()> {
        let chunk_dir = PathBuf::from(Self::CHUNK_DIR).join(upload_id);
        fs::create_dir_all(&chunk_dir).await?;
        Ok(())
    }

    async fn store_chunk(upload_id: &str, chunk_index: u32, data: &[u8]) -> Result<()> {
        let chunk_path = PathBuf::from(Self::CHUNK_DIR)
            .join(upload_id)
            .join(format!("chunk-{}.part", chunk_index));
        let mut chunk_file = File::create(&chunk_path).await?;
        chunk_file.write_all(data).await?;

        Ok(())
    }

    async fn merge_chunks(upload: &Upload) -> Result<PathBuf> {
        let upload_id = upload.id.unwrap().to_hex();
        let final_path =
            PathBuf::from(Self::UPLOAD_DIR).join(format!("{}-{}", upload_id, upload.file_name));

        // 确保上传目录存在
        if let Some(parent) = final_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        let mut final_file = File::create(&final_path).await?;
        let chunk_dir = PathBuf::from(Self::CHUNK_DIR).join(&upload_id);

        // 按顺序合并分片
        for chunk_index in 0..upload.total_chunks {
            let chunk_path = chunk_dir.join(format!("chunk-{}.part", chunk_index));
            let mut chunk_file = File::open(&chunk_path).await?;

            let mut buffer = Vec::new();
            chunk_file.read_to_end(&mut buffer).await?;
            final_file.write_all(&buffer).await?;
        }

        final_file.flush().await?;
        Ok(final_path)
    }

    async fn verify_integrity(file_path: &Path, expected_hash: &str) -> Result<()> {
        let calculated_hash = Self::calculate_hash_of_file(file_path).await?;
        if calculated_hash != expected_hash {
            fs::remove_file(file_path).await?;
            return Err(anyhow!(
                "File integrity check failed: expected {}, got {}",
                expected_hash,
                calculated_hash
            ));
        }
        Ok(())
    }

    async fn cleanup_chunks(upload_id: &str) -> Result<()> {
        let chunk_dir = PathBuf::from(Self::CHUNK_DIR).join(upload_id);
        if chunk_dir.exists() {
            fs::remove_dir_all(&chunk_dir).await?;
        }
        Ok(())
    }

    async fn append_chunk(db: &DataBase, upload_id: &str, chunk_index: u32) -> Result<()> {
        let object_id = ObjectId::parse_str(upload_id)?;

        // 使用 $addToSet 确保不重复添加，同时更新状态和时间
        db.uploads()
            .update_one(
                doc! { "_id": object_id },
                doc! {
                    "$addToSet": {
                        "uploadedChunks": chunk_index
                    },
                    "$set": {
                        "status": UploadStatus::Uploading.as_str(),
                        "updatedAt": DateTime::now().timestamp_millis(),
                    }
                },
            )
            .await?;
        Ok(())
    }

    /// 根据文件系统中实际存在的分片同步数据库中的 uploadedChunks
    pub async fn sync_chunks(db: &DataBase, upload_id: &str) -> Result<()> {
        let chunk_dir = PathBuf::from(Self::CHUNK_DIR).join(upload_id);

        if !chunk_dir.exists() {
            return Ok(());
        }

        let mut actual_chunks = Vec::new();

        // 扫描文件系统中实际存在的分片
        let mut entries = fs::read_dir(&chunk_dir).await?;
        while let Some(entry) = entries.next_entry().await? {
            let file_name = entry.file_name();
            let file_name_str = file_name.to_string_lossy();

            if file_name_str.starts_with("chunk-") && file_name_str.ends_with(".part") {
                // 提取分片索引 "chunk-0.part" -> "0"
                if let Some(index_str) = file_name_str
                    .strip_prefix("chunk-")
                    .and_then(|s| s.strip_suffix(".part"))
                {
                    if let Ok(index) = index_str.parse::<u32>() {
                        actual_chunks.push(index);
                    }
                }
            }
        }

        actual_chunks.sort();

        // 更新数据库中的 uploadedChunks
        let object_id = ObjectId::parse_str(upload_id)?;
        db.uploads()
            .update_one(
                doc! { "_id": object_id },
                doc! {
                    "$set": {
                        "uploadedChunks": to_bson(&actual_chunks)?,
                        "status": if actual_chunks.is_empty() {
                            UploadStatus::Pending.as_str()
                        } else {
                            UploadStatus::Uploading.as_str()
                        },
                        "updatedAt": DateTime::now().timestamp_millis(),
                    }
                },
            )
            .await?;

        println!(
            "已同步上传记录 {}: 找到 {} 个分片",
            upload_id,
            actual_chunks.len()
        );
        Ok(())
    }

    async fn mark_completed(db: &DataBase, upload_id: &str, file_path: &Path) -> Result<()> {
        let object_id = ObjectId::parse_str(upload_id)?;

        db.uploads()
            .update_one(
                doc! {
                  "_id": object_id
                },
                doc! {
                  "$set":{
                    "status": UploadStatus::Completed.as_str(),
                    "storagePath": file_path.to_string_lossy().to_string(),
                    "updatedAt": DateTime::now().timestamp_millis()
                  }
                },
            )
            .await?;

        Ok(())
    }

    async fn mark_failed(db: &DataBase, upload_id: &str) -> Result<()> {
        let object_id = ObjectId::parse_str(upload_id)?;

        db.uploads()
            .update_one(
                doc! {
                  "_id": object_id,
                },
                doc! {
                  "$set":{
                    "status": UploadStatus::Failed.as_str(),
                    "updatedAt": DateTime::now().timestamp_millis()
                  }
                },
            )
            .await?;

        Ok(())
    }

    fn calculate_hash(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }

    async fn calculate_hash_of_file(file_path: &Path) -> Result<String> {
        let mut file = File::open(file_path).await?;
        let mut hasher = Sha256::new();
        let mut buffer = vec![0; 65536]; // 64KB buffer

        loop {
            let bytes_read = file.read(&mut buffer).await?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }
        Ok(format!("{:x}", hasher.finalize()))
    }
}
