layenbrank: 如何使用 actix web 实现一个大文件分片上传的接口，
供前端调用，逻辑严谨，企业中是如何实现的，详细说明如何实现

GitHub Copilot: 我来详细解释如何在 Actix Web 中实现一个企业级的大文件分片上传接口。首先让我了解一下当前项目的结构和依赖。

layenbrank: 如何使用 actix web 实现一个大文件分片上传的接口，
供前端调用，逻辑严谨，企业中是如何实现的，详细说明如何实现

GitHub Copilot: 我来详细为您实现一个企业级的大文件分片上传功能。基于您的项目结构，我将创建完整的上传模块。

## 企业级大文件分片上传的核心设计思路

企业中的大文件上传通常包含以下关键特性：

1. **分片上传**：将大文件切分成小块并发上传
2. **断点续传**：支持网络中断后继续上传
3. **文件完整性校验**：MD5/SHA256 校验
4. **并发控制**：限制同时上传的分片数量
5. **存储优化**：临时分片存储和最终文件合并
6. **安全性**：文件类型检查、大小限制等

让我为您实现完整的解决方案：

## 1. 首先定义数据结构 (schema.rs)

```rust
use crate::utils::datetime_serde::{deserialize_datetime, serialize_datetime};
use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileUpload {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub file_name: String,
    pub file_size: u64,
    pub file_hash: String, // 文件的MD5哈希
    pub mime_type: String,
    pub chunk_size: u32,
    pub total_chunks: u32,
    pub uploaded_chunks: Vec<u32>, // 已上传的分片编号
    pub upload_status: UploadStatus,
    pub storage_path: Option<String>, // 最终文件存储路径
    pub uploader_id: Option<String>, // 上传者ID
    #[serde(
        serialize_with = "serialize_datetime",
        deserialize_with = "deserialize_datetime"
    )]
    pub created_at: mongodb::bson::DateTime,
    #[serde(
        serialize_with = "serialize_datetime",
        deserialize_with = "deserialize_datetime"
    )]
    pub updated_at: mongodb::bson::DateTime,
    pub expires_at: Option<mongodb::bson::DateTime>, // 过期时间
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum UploadStatus {
    Pending,    // 等待上传
    Uploading,  // 上传中
    Completed,  // 上传完成
    Failed,     // 上传失败
    Expired,    // 已过期
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitUploadRequest {
    pub file_name: String,
    pub file_size: u64,
    pub file_hash: String,
    pub mime_type: String,
    pub chunk_size: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitUploadResponse {
    pub upload_id: String,
    pub file_exists: bool, // 文件是否已存在（秒传）
    pub uploaded_chunks: Vec<u32>, // 已上传的分片（断点续传）
    pub upload_url: String, // 分片上传的URL模板
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChunkUploadRequest {
    pub upload_id: String,
    pub chunk_index: u32,
    pub chunk_hash: String, // 分片的MD5哈希
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChunkUploadResponse {
    pub success: bool,
    pub chunk_index: u32,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteUploadRequest {
    pub upload_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteUploadResponse {
    pub success: bool,
    pub file_url: String,
    pub file_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadProgressResponse {
    pub upload_id: String,
    pub progress: f32, // 0.0 - 1.0
    pub uploaded_chunks: Vec<u32>,
    pub total_chunks: u32,
    pub status: UploadStatus,
}
```

## 2. 实现服务层逻辑 (service.rs)

```rust
use crate::database::DataBase;
use crate::errors::{AppError, AppResult};
use crate::services::upload::schema::*;
use futures::TryStreamExt;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use std::path::{Path, PathBuf};
use tokio::fs::{self, File, OpenOptions};
use tokio::io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt, SeekFrom};
use std::collections::HashSet;
use sha2::{Sha256, Digest};

pub struct UploadService;

impl UploadService {
    const UPLOAD_DIR: &'static str = "uploads";
    const CHUNK_DIR: &'static str = "chunks";
    const MAX_FILE_SIZE: u64 = 5 * 1024 * 1024 * 1024; // 5GB
    const MIN_CHUNK_SIZE: u32 = 1024 * 1024; // 1MB
    const MAX_CHUNK_SIZE: u32 = 10 * 1024 * 1024; // 10MB

    /// 初始化文件上传
    pub async fn init_upload(
        db: &DataBase,
        req: InitUploadRequest,
        uploader_id: Option<String>,
    ) -> AppResult<InitUploadResponse> {
        // 验证请求参数
        Self::validate_upload_request(&req)?;

        // 检查文件是否已存在（秒传功能）
        if let Some(existing) = Self::check_file_exists(db, &req.file_hash).await? {
            return Ok(InitUploadResponse {
                upload_id: existing.id.map_or("".to_string(), |id| id.to_hex()),
                file_exists: true,
                uploaded_chunks: vec![],
                upload_url: format!("/api/upload/chunk"),
            });
        }

        // 检查是否有未完成的上传任务
        if let Some(existing) = Self::find_pending_upload(db, &req.file_hash, uploader_id.as_deref()).await? {
            return Ok(InitUploadResponse {
                upload_id: existing.id.map_or("".to_string(), |id| id.to_hex()),
                file_exists: false,
                uploaded_chunks: existing.uploaded_chunks,
                upload_url: format!("/api/upload/chunk"),
            });
        }

        // 创建新的上传任务
        let total_chunks = (req.file_size + req.chunk_size as u64 - 1) / req.chunk_size as u64;
        let now = DateTime::now();
        let expires_at = DateTime::from_millis(now.timestamp_millis() + 24 * 60 * 60 * 1000); // 24小时后过期

        let upload = FileUpload {
            id: None,
            file_name: req.file_name,
            file_size: req.file_size,
            file_hash: req.file_hash,
            mime_type: req.mime_type,
            chunk_size: req.chunk_size,
            total_chunks: total_chunks as u32,
            uploaded_chunks: vec![],
            upload_status: UploadStatus::Pending,
            storage_path: None,
            uploader_id,
            created_at: now,
            updated_at: now,
            expires_at: Some(expires_at),
        };

        let result = db.uploads().insert_one(&upload).await?;
        let upload_id = result.inserted_id.as_object_id().map_or("".to_string(), |id| id.to_hex());

        // 创建分片存储目录
        Self::ensure_chunk_directory(&upload_id).await?;

        Ok(InitUploadResponse {
            upload_id,
            file_exists: false,
            uploaded_chunks: vec![],
            upload_url: format!("/api/upload/chunk"),
        })
    }

    /// 上传文件分片
    pub async fn upload_chunk(
        db: &DataBase,
        upload_id: &str,
        chunk_index: u32,
        chunk_data: Vec<u8>,
        chunk_hash: &str,
    ) -> AppResult<ChunkUploadResponse> {
        // 获取上传任务信息
        let mut upload = Self::get_upload_by_id(db, upload_id).await?;

        // 验证上传状态
        if matches!(upload.upload_status, UploadStatus::Completed | UploadStatus::Failed | UploadStatus::Expired) {
            return Err(AppError::InvalidInput("Upload is not in valid state".to_string()));
        }

        // 验证分片索引
        if chunk_index >= upload.total_chunks {
            return Err(AppError::InvalidInput("Invalid chunk index".to_string()));
        }

        // 验证分片哈希
        let calculated_hash = Self::calculate_hash(&chunk_data);
        if calculated_hash != chunk_hash {
            return Err(AppError::InvalidInput("Chunk hash mismatch".to_string()));
        }

        // 检查分片是否已上传
        if upload.uploaded_chunks.contains(&chunk_index) {
            return Ok(ChunkUploadResponse {
                success: true,
                chunk_index,
                message: "Chunk already uploaded".to_string(),
            });
        }

        // 保存分片到临时文件
        Self::save_chunk(upload_id, chunk_index, &chunk_data).await?;

        // 更新上传进度
        upload.uploaded_chunks.push(chunk_index);
        upload.upload_status = UploadStatus::Uploading;
        upload.updated_at = DateTime::now();

        Self::update_upload_progress(db, upload_id, &upload.uploaded_chunks, &upload.upload_status).await?;

        Ok(ChunkUploadResponse {
            success: true,
            chunk_index,
            message: "Chunk uploaded successfully".to_string(),
        })
    }

    /// 完成文件上传
    pub async fn complete_upload(
        db: &DataBase,
        upload_id: &str,
    ) -> AppResult<CompleteUploadResponse> {
        let upload = Self::get_upload_by_id(db, upload_id).await?;

        // 验证所有分片都已上传
        if upload.uploaded_chunks.len() != upload.total_chunks as usize {
            return Err(AppError::InvalidInput("Not all chunks uploaded".to_string()));
        }

        // 合并文件分片
        let final_path = Self::merge_chunks(&upload).await?;

        // 验证合并后的文件哈希
        let merged_hash = Self::calculate_file_hash(&final_path).await?;
        if merged_hash != upload.file_hash {
            // 清理文件
            let _ = fs::remove_file(&final_path).await;
            return Err(AppError::InvalidInput("File integrity check failed".to_string()));
        }

        // 更新数据库记录
        let now = DateTime::now();
        db.uploads()
            .update_one(
                doc! {"_id": ObjectId::parse_str(upload_id)?},
                doc! {
                    "$set": {
                        "upload_status": "COMPLETED",
                        "storage_path": final_path.to_string_lossy().to_string(),
                        "updated_at": now
                    }
                },
            )
            .await?;

        // 清理临时分片文件
        Self::cleanup_chunks(upload_id).await?;

        Ok(CompleteUploadResponse {
            success: true,
            file_url: format!("/api/files/{}", upload.file_hash),
            file_id: upload_id.to_string(),
        })
    }

    /// 获取上传进度
    pub async fn get_upload_progress(
        db: &DataBase,
        upload_id: &str,
    ) -> AppResult<UploadProgressResponse> {
        let upload = Self::get_upload_by_id(db, upload_id).await?;

        let progress = upload.uploaded_chunks.len() as f32 / upload.total_chunks as f32;

        Ok(UploadProgressResponse {
            upload_id: upload_id.to_string(),
            progress,
            uploaded_chunks: upload.uploaded_chunks,
            total_chunks: upload.total_chunks,
            status: upload.upload_status,
        })
    }

    /// 取消上传
    pub async fn cancel_upload(db: &DataBase, upload_id: &str) -> AppResult<()> {
        // 更新状态为失败
        db.uploads()
            .update_one(
                doc! {"_id": ObjectId::parse_str(upload_id)?},
                doc! {
                    "$set": {
                        "upload_status": "FAILED",
                        "updated_at": DateTime::now()
                    }
                },
            )
            .await?;

        // 清理临时文件
        Self::cleanup_chunks(upload_id).await?;

        Ok(())
    }

    // === 私有辅助方法 ===

    fn validate_upload_request(req: &InitUploadRequest) -> AppResult<()> {
        if req.file_size > Self::MAX_FILE_SIZE {
            return Err(AppError::InvalidInput("File size exceeds limit".to_string()));
        }

        if req.chunk_size < Self::MIN_CHUNK_SIZE || req.chunk_size > Self::MAX_CHUNK_SIZE {
            return Err(AppError::InvalidInput("Invalid chunk size".to_string()));
        }

        if req.file_name.is_empty() || req.file_hash.is_empty() {
            return Err(AppError::InvalidInput("Missing required fields".to_string()));
        }

        Ok(())
    }

    async fn check_file_exists(db: &DataBase, file_hash: &str) -> AppResult<Option<FileUpload>> {
        Ok(db
            .uploads()
            .find_one(doc! {
                "file_hash": file_hash,
                "upload_status": "COMPLETED"
            })
            .await?)
    }

    async fn find_pending_upload(
        db: &DataBase,
        file_hash: &str,
        uploader_id: Option<&str>,
    ) -> AppResult<Option<FileUpload>> {
        let mut filter = doc! {
            "file_hash": file_hash,
            "upload_status": {"$in": ["PENDING", "UPLOADING"]}
        };

        if let Some(uid) = uploader_id {
            filter.insert("uploader_id", uid);
        }

        Ok(db.uploads().find_one(filter).await?)
    }

    async fn get_upload_by_id(db: &DataBase, upload_id: &str) -> AppResult<FileUpload> {
        let object_id = ObjectId::parse_str(upload_id)
            .map_err(|_| AppError::InvalidInput("Invalid upload ID".to_string()))?;

        db.uploads()
            .find_one(doc! {"_id": object_id})
            .await?
            .ok_or(AppError::NotFound("Upload not found".to_string()))
    }

    async fn ensure_chunk_directory(upload_id: &str) -> AppResult<()> {
        let chunk_dir = PathBuf::from(Self::CHUNK_DIR).join(upload_id);
        fs::create_dir_all(&chunk_dir).await?;
        Ok(())
    }

    async fn save_chunk(upload_id: &str, chunk_index: u32, data: &[u8]) -> AppResult<()> {
        let chunk_path = PathBuf::from(Self::CHUNK_DIR)
            .join(upload_id)
            .join(format!("chunk_{}", chunk_index));

        let mut file = File::create(&chunk_path).await?;
        file.write_all(data).await?;
        file.flush().await?;

        Ok(())
    }

    async fn merge_chunks(upload: &FileUpload) -> AppResult<PathBuf> {
        let upload_id = upload.id.map_or("".to_string(), |id| id.to_hex());
        let final_path = PathBuf::from(Self::UPLOAD_DIR)
            .join(format!("{}_{}", upload.file_hash, upload.file_name));

        // 确保上传目录存在
        if let Some(parent) = final_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        let mut final_file = File::create(&final_path).await?;
        let chunk_dir = PathBuf::from(Self::CHUNK_DIR).join(&upload_id);

        // 按顺序合并分片
        for chunk_index in 0..upload.total_chunks {
            let chunk_path = chunk_dir.join(format!("chunk_{}", chunk_index));
            let mut chunk_file = File::open(&chunk_path).await?;
            let mut buffer = Vec::new();
            chunk_file.read_to_end(&mut buffer).await?;
            final_file.write_all(&buffer).await?;
        }

        final_file.flush().await?;
        Ok(final_path)
    }

    async fn cleanup_chunks(upload_id: &str) -> AppResult<()> {
        let chunk_dir = PathBuf::from(Self::CHUNK_DIR).join(upload_id);
        if chunk_dir.exists() {
            fs::remove_dir_all(&chunk_dir).await?;
        }
        Ok(())
    }

    async fn update_upload_progress(
        db: &DataBase,
        upload_id: &str,
        uploaded_chunks: &[u32],
        status: &UploadStatus,
    ) -> AppResult<()> {
        db.uploads()
            .update_one(
                doc! {"_id": ObjectId::parse_str(upload_id)?},
                doc! {
                    "$set": {
                        "uploaded_chunks": uploaded_chunks,
                        "upload_status": status,
                        "updated_at": DateTime::now()
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

    async fn calculate_file_hash(file_path: &Path) -> AppResult<String> {
        let mut file = File::open(file_path).await?;
        let mut hasher = Sha256::new();
        let mut buffer = vec![0; 8192];

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
```

## 3. 实现控制器 (controller.rs)

```rust
\src\services\upload\controller.rs
use crate::database::DataBase;
use crate::errors::AppResult;
use crate::services::upload::schema::*;
use crate::services::upload::service::UploadService;
use actix_multipart::Multipart;
use actix_web::{web, HttpResponse};
use futures::{StreamExt, TryStreamExt};
use std::sync::Arc;

pub struct UploadController;

impl UploadController {
    /// 初始化上传
    pub async fn init_upload(
        db: web::Data<Arc<DataBase>>,
        req: web::Json<InitUploadRequest>,
    ) -> AppResult<HttpResponse> {
        let response = UploadService::init_upload(&db, req.into_inner(), None).await?;
        Ok(HttpResponse::Ok().json(response))
    }

    /// 上传分片
    pub async fn upload_chunk(
        db: web::Data<Arc<DataBase>>,
        mut payload: Multipart,
    ) -> AppResult<HttpResponse> {
        let mut upload_id = String::new();
        let mut chunk_index = 0u32;
        let mut chunk_hash = String::new();
        let mut chunk_data = Vec::new();

        // 解析 multipart 数据
        while let Some(mut field) = payload.try_next().await? {
            let name = field.name();

            match name {
                "uploadId" => {
                    let mut bytes = web::BytesMut::new();
                    while let Some(chunk) = field.try_next().await? {
                        bytes.extend_from_slice(&chunk);
                    }
                    upload_id = String::from_utf8(bytes.to_vec())?;
                }
                "chunkIndex" => {
                    let mut bytes = web::BytesMut::new();
                    while let Some(chunk) = field.try_next().await? {
                        bytes.extend_from_slice(&chunk);
                    }
                    chunk_index = String::from_utf8(bytes.to_vec())?.parse()?;
                }
                "chunkHash" => {
                    let mut bytes = web::BytesMut::new();
                    while let Some(chunk) = field.try_next().await? {
                        bytes.extend_from_slice(&chunk);
                    }
                    chunk_hash = String::from_utf8(bytes.to_vec())?;
                }
                "chunk" => {
                    while let Some(chunk) = field.try_next().await? {
                        chunk_data.extend_from_slice(&chunk);
                    }
                }
                _ => {
                    // 忽略其他字段
                    while let Some(_) = field.try_next().await? {}
                }
            }
        }

        let response = UploadService::upload_chunk(
            &db,
            &upload_id,
            chunk_index,
            chunk_data,
            &chunk_hash,
        ).await?;

        Ok(HttpResponse::Ok().json(response))
    }

    /// 完成上传
    pub async fn complete_upload(
        db: web::Data<Arc<DataBase>>,
        req: web::Json<CompleteUploadRequest>,
    ) -> AppResult<HttpResponse> {
        let response = UploadService::complete_upload(&db, &req.upload_id).await?;
        Ok(HttpResponse::Ok().json(response))
    }

    /// 获取上传进度
    pub async fn get_progress(
        db: web::Data<Arc<DataBase>>,
        path: web::Path<String>,
    ) -> AppResult<HttpResponse> {
        let upload_id = path.into_inner();
        let response = UploadService::get_upload_progress(&db, &upload_id).await?;
        Ok(HttpResponse::Ok().json(response))
    }

    /// 取消上传
    pub async fn cancel_upload(
        db: web::Data<Arc<DataBase>>,
        path: web::Path<String>,
    ) -> AppResult<HttpResponse> {
        let upload_id = path.into_inner();
        UploadService::cancel_upload(&db, &upload_id).await?;
        Ok(HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "message": "Upload cancelled successfully"
        })))
    }

    /// 获取文件列表
    pub async fn list_files(
        db: web::Data<Arc<DataBase>>,
        query: web::Query<ListFilesQuery>,
    ) -> AppResult<HttpResponse> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(20);

        // 这里可以实现分页查询逻辑
        let files = UploadService::list_completed_files(&db, page, limit).await?;

        Ok(HttpResponse::Ok().json(files))
    }
}

#[derive(serde::Deserialize)]
pub struct ListFilesQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
}
```

## 4. 配置路由模块 (module.rs)

```rust
use crate::services::upload::controller::UploadController;
use actix_web::web;

pub struct UploadModule;

impl UploadModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/upload")
                .route("/init", web::post().to(UploadController::init_upload))
                .route("/chunk", web::post().to(UploadController::upload_chunk))
                .route("/complete", web::post().to(UploadController::complete_upload))
                .route("/progress/{upload_id}", web::get().to(UploadController::get_progress))
                .route("/cancel/{upload_id}", web::delete().to(UploadController::cancel_upload))
                .route("/files", web::get().to(UploadController::list_files)),
        );
    }
}
```

## 5. 需要在数据库模块中添加 uploads 集合

在您的 `database.rs` 文件中添加：

```rust
impl DataBase {
    // ...existing code...

    pub fn uploads(&self) -> mongodb::Collection<crate::services::upload::schema::FileUpload> {
        self.db.collection("uploads")
    }
}
```

## 6. 前端使用示例

这是对应的前端 JavaScript 实现示例：

```javascript
class ChunkUploader {
  constructor(file, options = {}) {
    this.file = file;
    this.chunkSize = options.chunkSize || 1024 * 1024; // 1MB
    this.baseUrl = options.baseUrl || "/api";
    this.onProgress = options.onProgress || (() => {});
    this.onError = options.onError || (() => {});
    this.onComplete = options.onComplete || (() => {});

    this.uploadId = null;
    this.totalChunks = Math.ceil(file.size / this.chunkSize);
    this.uploadedChunks = new Set();
    this.isUploading = false;
  }

  async calculateFileHash() {
    // 使用 Web Crypto API 计算文件哈希
    const buffer = await this.file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async calculateChunkHash(chunk) {
    const buffer = await chunk.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async initUpload() {
    const fileHash = await this.calculateFileHash();

    const response = await fetch(`${this.baseUrl}/upload/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: this.file.name,
        fileSize: this.file.size,
        fileHash,
        mimeType: this.file.type,
        chunkSize: this.chunkSize,
      }),
    });

    const result = await response.json();

    if (result.fileExists) {
      this.onComplete(result);
      return;
    }

    this.uploadId = result.uploadId;
    this.uploadedChunks = new Set(result.uploadedChunks);

    return result;
  }

  async uploadChunk(chunkIndex) {
    const start = chunkIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.file.size);
    const chunk = this.file.slice(start, end);
    const chunkHash = await this.calculateChunkHash(chunk);

    const formData = new FormData();
    formData.append("uploadId", this.uploadId);
    formData.append("chunkIndex", chunkIndex.toString());
    formData.append("chunkHash", chunkHash);
    formData.append("chunk", chunk);

    const response = await fetch(`${this.baseUrl}/upload/chunk`, {
      method: "POST",
      body: formData,
    });

    return response.json();
  }

  async completeUpload() {
    const response = await fetch(`${this.baseUrl}/upload/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId: this.uploadId }),
    });

    return response.json();
  }

  async upload() {
    if (this.isUploading) return;

    this.isUploading = true;

    try {
      // 初始化上传
      await this.initUpload();

      if (!this.uploadId) return; // 文件已存在，直接返回

      // 并发上传分片
      const concurrency = 3; // 同时上传3个分片
      const chunks = [];

      for (let i = 0; i < this.totalChunks; i++) {
        if (!this.uploadedChunks.has(i)) {
          chunks.push(i);
        }
      }

      // 分批上传
      for (let i = 0; i < chunks.length; i += concurrency) {
        const batch = chunks.slice(i, i + concurrency);
        const promises = batch.map((chunkIndex) =>
          this.uploadChunk(chunkIndex)
        );

        await Promise.all(promises);

        // 更新进度
        const progress =
          (this.uploadedChunks.size + batch.length) / this.totalChunks;
        this.onProgress(progress);

        batch.forEach((chunkIndex) => this.uploadedChunks.add(chunkIndex));
      }

      // 完成上传
      const result = await this.completeUpload();
      this.onComplete(result);
    } catch (error) {
      this.onError(error);
    } finally {
      this.isUploading = false;
    }
  }
}

// 使用示例
const fileInput = document.getElementById("file-input");
const progressBar = document.getElementById("progress");

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const uploader = new ChunkUploader(file, {
    chunkSize: 2 * 1024 * 1024, // 2MB 分片
    onProgress: (progress) => {
      progressBar.style.width = `${progress * 100}%`;
      progressBar.textContent = `${Math.round(progress * 100)}%`;
    },
    onComplete: (result) => {
      console.log("Upload completed:", result);
      alert("文件上传成功！");
    },
    onError: (error) => {
      console.error("Upload failed:", error);
      alert("文件上传失败！");
    },
  });

  uploader.upload();
});
```

## 核心特性说明

### 1. **秒传功能**

通过文件哈希值检查，如果服务器已有相同文件，直接返回成功。

### 2. **断点续传**

记录已上传的分片信息，网络中断后可以从断点继续。

### 3. **并发上传**

前端可以同时上传多个分片，提高上传效率。

### 4. **完整性校验**

每个分片和最终文件都会进行哈希校验，确保数据完整性。

### 5. **临时文件管理**

分片临时存储，上传完成后合并并清理临时文件。

### 6. **过期清理**

设置上传任务过期时间，定期清理无效数据。

这个实现方案考虑了企业级应用的各种需求，包括性能、可靠性、安全性等方面。您可以根据具体需求进行调整和优化。

找到具有 2 个许可证类型的类似代码
