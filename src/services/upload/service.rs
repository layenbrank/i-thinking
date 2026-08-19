use crate::databases::database::Storage;
use crate::services::upload::schema::{
    ChunkUploadResponse, FinalizeUploadResponse, UploadProgressResponse, UploadRequest,
    UploadResponse, UploadStatus,
};
use actix_web::{
    Result, error::ErrorBadRequest, error::ErrorInternalServerError, error::ErrorNotFound,
};
use chrono::{Duration, Utc};
use entity::uploads;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait, DatabaseBackend, EntityTrait,
    QueryFilter, Set, Statement,
};
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use tokio::fs::{self, File};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use uuid::Uuid;

pub struct UploadService;

impl UploadService {
    const UPLOAD_DIR: &'static str = "uploads";
    const CHUNK_DIR: &'static str = "chunks";
    const MAX_FILE_SIZE: u64 = 5 * 1024 * 1024 * 1024; // 5GB
    const MIN_CHUNK_SIZE: u32 = 1024 * 1024; // 1MB
    const MAX_CHUNK_SIZE: u32 = 10 * 1024 * 1024; // 10MB
    const EXPIRE_HOURS: i64 = 24;
    const FILE_URL_PREFIX: &'static str = "/api/v1/upload/files";

    pub async fn prepare(
        db: &Storage,
        req: UploadRequest,
        uploader_id: Option<String>,
    ) -> Result<UploadResponse> {
        Self::validate(&req)?;

        if let Some(existing) = Self::find_completed(db, &req.file_hash).await? {
            return Ok(UploadResponse {
                upload_id: existing.id.to_string(),
                file_exists: true,
                uploaded_chunks: vec![],
                upload_url: "/api/v1/upload/chunk".to_string(),
            });
        }

        if let Some(existing) =
            Self::find_pending(db, &req.file_hash, uploader_id.as_deref()).await?
        {
            return Ok(UploadResponse {
                upload_id: existing.id.to_string(),
                file_exists: false,
                uploaded_chunks: to_u32_chunks(&existing.uploaded_chunks),
                upload_url: "/api/v1/upload/chunk".to_string(),
            });
        }

        let upload = Self::build_record(req, uploader_id)?;
        let inserted = upload
            .insert(&db.db)
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {e}")))?;
        let upload_id = inserted.id.to_string();
        Self::prepare_chunk_dir(&upload_id).await?;

        Ok(UploadResponse {
            upload_id,
            file_exists: false,
            uploaded_chunks: vec![],
            upload_url: "/api/v1/upload/chunk".to_string(),
        })
    }

    pub async fn chunk(
        db: &Storage,
        upload_id: &str,
        chunk_index: u32,
        chunk_data: Vec<u8>,
        chunk_hash: &str,
    ) -> Result<ChunkUploadResponse> {
        let upload = Self::find_by_id(db, upload_id).await?;
        Self::validate_status(&upload)?;
        Self::validate_chunk(&upload, chunk_index, &chunk_data, chunk_hash)?;

        if upload.uploaded_chunks.contains(&(chunk_index as i32)) {
            return Ok(ChunkUploadResponse {
                success: true,
                chunk_index,
                message: format!("Chunk {} already uploaded", chunk_index),
            });
        }

        Self::store_chunk(upload_id, chunk_index, &chunk_data).await?;
        Self::append_chunk(db, upload, chunk_index).await?;

        Ok(ChunkUploadResponse {
            success: true,
            chunk_index,
            message: format!("Chunk {} uploaded successfully", chunk_index),
        })
    }

    pub async fn finalize(db: &Storage, upload_id: &str) -> Result<FinalizeUploadResponse> {
        Self::sync_chunks(db, upload_id).await?;
        let upload = Self::find_by_id(db, upload_id).await?;
        Self::validate_completion(&upload)?;
        let final_path = Self::merge_chunks(&upload).await?;
        Self::verify_integrity(&final_path, &upload.file_hash).await?;
        Self::mark_completed(db, &upload, &final_path).await?;
        Self::cleanup_chunks(upload_id).await?;

        Ok(FinalizeUploadResponse {
            success: true,
            file_url: format!("{}/{}", Self::FILE_URL_PREFIX, upload.file_hash),
            file_id: upload_id.to_string(),
        })
    }

    pub async fn progress(db: &Storage, upload_id: &str) -> Result<UploadProgressResponse> {
        let upload = Self::find_by_id(db, upload_id).await?;
        let progress = if upload.total_chunks == 0 {
            0.0
        } else {
            upload.uploaded_chunks.len() as f64 / upload.total_chunks as f64 * 100.0
        };

        Ok(UploadProgressResponse {
            upload_id: upload_id.to_string(),
            progress,
            uploaded_chunks: to_u32_chunks(&upload.uploaded_chunks),
            total_chunks: upload.total_chunks as u32,
            status: UploadStatus::from_db(&upload.status),
        })
    }

    fn build_record(
        req: UploadRequest,
        uploader_id: Option<String>,
    ) -> Result<uploads::ActiveModel> {
        let total_chunks = (req.file_size + req.chunk_size as u64 - 1) / req.chunk_size as u64;
        let now = Utc::now().fixed_offset();
        let uploader_id = match uploader_id.as_deref() {
            Some(id) => {
                Some(Uuid::parse_str(id).map_err(|_| ErrorBadRequest("Invalid uploader ID"))?)
            }
            None => None,
        };

        Ok(uploads::ActiveModel {
            id: Set(Uuid::new_v4()),
            file_name: Set(req.file_name),
            file_size: Set(req.file_size as i64),
            file_hash: Set(req.file_hash),
            mime_type: Set(req.mime_type),
            chunk_size: Set(req.chunk_size as i32),
            total_chunks: Set(total_chunks as i32),
            uploaded_chunks: Set(vec![]),
            status: Set(UploadStatus::Pending.as_str().to_string()),
            storage_path: Set(None),
            uploader_id: Set(uploader_id),
            created_at: Set(now),
            updated_at: Set(now),
            expires_at: Set(Some(now + Duration::hours(Self::EXPIRE_HOURS))),
        })
    }

    pub async fn cancel(db: &Storage, upload_id: &str) -> Result<()> {
        let upload = Self::find_by_id(db, upload_id).await?;
        Self::mark_failed(db, upload).await?;
        Self::cleanup_chunks(upload_id).await?;
        Ok(())
    }

    fn validate(req: &UploadRequest) -> Result<()> {
        if req.file_size > Self::MAX_FILE_SIZE {
            return Err(ErrorBadRequest(format!(
                "File size exceeds limit of {}GB",
                Self::MAX_FILE_SIZE / (1024 * 1024 * 1024)
            )));
        }

        if req.chunk_size < Self::MIN_CHUNK_SIZE || req.chunk_size > Self::MAX_CHUNK_SIZE {
            return Err(ErrorBadRequest(format!(
                "Chunk size must be between {}MB and {}MB",
                Self::MIN_CHUNK_SIZE / (1024 * 1024),
                Self::MAX_CHUNK_SIZE / (1024 * 1024)
            )));
        }

        if req.file_size == 0 {
            return Err(ErrorBadRequest("File size must be greater than 0"));
        }

        if req.file_name.trim().is_empty() {
            return Err(ErrorBadRequest("File name cannot be empty"));
        }

        if req.file_hash.len() != 64 {
            return Err(ErrorBadRequest("Invalid file hash format"));
        }

        Ok(())
    }

    fn validate_status(upload: &uploads::Model) -> Result<()> {
        if upload
            .expires_at
            .is_some_and(|expires_at| expires_at < Utc::now().fixed_offset())
        {
            return Err(ErrorBadRequest("Upload expired"));
        }

        match UploadStatus::from_db(&upload.status) {
            UploadStatus::Pending | UploadStatus::Uploading => Ok(()),
            UploadStatus::Completed => Err(ErrorBadRequest("Upload already completed")),
            UploadStatus::Failed => Err(ErrorBadRequest("Upload failed, cannot continue")),
            UploadStatus::Expired => Err(ErrorBadRequest("Upload expired")),
        }
    }

    fn validate_chunk(
        upload: &uploads::Model,
        chunk_index: u32,
        chunk_data: &[u8],
        chunk_hash: &str,
    ) -> Result<()> {
        if chunk_index >= upload.total_chunks as u32 {
            return Err(ErrorBadRequest(format!(
                "Invalid chunk index: {}",
                chunk_index
            )));
        }

        let calculated_hash = Self::calculate_hash(chunk_data);
        if calculated_hash != chunk_hash {
            return Err(ErrorBadRequest(format!(
                "Chunk hash mismatch: expected {}, got {}",
                chunk_hash, calculated_hash
            )));
        }

        let expected_size = if chunk_index == upload.total_chunks as u32 - 1 {
            let remaining = upload.file_size as u64 % upload.chunk_size as u64;
            if remaining == 0 {
                upload.chunk_size as usize
            } else {
                remaining as usize
            }
        } else {
            upload.chunk_size as usize
        };

        if chunk_data.len() != expected_size {
            return Err(ErrorBadRequest(format!(
                "Chunk size mismatch: expected {}, got {}",
                expected_size,
                chunk_data.len()
            )));
        }
        Ok(())
    }

    fn validate_completion(upload: &uploads::Model) -> Result<()> {
        if upload.uploaded_chunks.len() != upload.total_chunks as usize {
            return Err(ErrorBadRequest(format!(
                "Upload is not complete, missing chunks: {} of {}",
                upload.uploaded_chunks.len(),
                upload.total_chunks
            )));
        }

        let mut sorted_chunks = upload.uploaded_chunks.clone();
        sorted_chunks.sort();

        for (i, &chunk_index) in sorted_chunks.iter().enumerate() {
            if chunk_index != i as i32 {
                return Err(ErrorBadRequest(format!(
                    "Missing chunk at index {}: expected {}, found {}",
                    i, i, chunk_index
                )));
            }
        }

        Ok(())
    }

    async fn find_completed(db: &Storage, file_hash: &str) -> Result<Option<uploads::Model>> {
        uploads::Entity::find()
            .filter(uploads::Column::FileHash.eq(file_hash))
            .filter(uploads::Column::Status.eq(UploadStatus::Completed.as_str()))
            .one(&db.db)
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {e}")))
    }

    pub async fn find_file_by_hash(
        db: &Storage,
        file_hash: &str,
    ) -> Result<Option<uploads::Model>> {
        Self::find_completed(db, file_hash).await
    }

    async fn find_pending(
        db: &Storage,
        file_hash: &str,
        uploader_id: Option<&str>,
    ) -> Result<Option<uploads::Model>> {
        let Some(uploader_id) = uploader_id else {
            return Ok(None);
        };
        let uploader =
            Uuid::parse_str(uploader_id).map_err(|_| ErrorBadRequest("Invalid uploader ID"))?;
        let now = Utc::now().fixed_offset();

        uploads::Entity::find()
            .filter(uploads::Column::FileHash.eq(file_hash))
            .filter(uploads::Column::UploaderId.eq(uploader))
            .filter(uploads::Column::Status.is_in([
                UploadStatus::Pending.as_str(),
                UploadStatus::Uploading.as_str(),
            ]))
            .filter(
                Condition::any()
                    .add(uploads::Column::ExpiresAt.is_null())
                    .add(uploads::Column::ExpiresAt.gt(now)),
            )
            .one(&db.db)
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {e}")))
    }

    async fn find_by_id(db: &Storage, upload_id: &str) -> Result<uploads::Model> {
        let id = Uuid::parse_str(upload_id).map_err(|_| ErrorBadRequest("Invalid upload ID"))?;
        uploads::Entity::find_by_id(id)
            .one(&db.db)
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {e}")))?
            .ok_or_else(|| ErrorNotFound("Upload not found"))
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

    async fn merge_chunks(upload: &uploads::Model) -> Result<PathBuf> {
        let upload_id = upload.id.to_string();
        let final_path =
            PathBuf::from(Self::UPLOAD_DIR).join(format!("{}-{}", upload_id, upload.file_name));

        if let Some(parent) = final_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        let mut final_file = File::create(&final_path).await?;
        let chunk_dir = PathBuf::from(Self::CHUNK_DIR).join(&upload_id);

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
        let calculated_hash = Self::calculate_hash_of_file(file_path).await.map_err(|e| {
            ErrorInternalServerError(format!("Failed to calculate file hash: {}", e))
        })?;
        if calculated_hash != expected_hash {
            let _ = fs::remove_file(file_path).await;
            return Err(ErrorInternalServerError(format!(
                "File integrity check failed: expected {}, got {}",
                expected_hash, calculated_hash
            )));
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

    async fn append_chunk(db: &Storage, upload: uploads::Model, chunk_index: u32) -> Result<()> {
        let now = Utc::now().fixed_offset();
        db.db
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Postgres,
                r#"UPDATE uploads
                   SET "uploadedChunks" = CASE
                         WHEN $2 = ANY("uploadedChunks") THEN "uploadedChunks"
                         ELSE array_append("uploadedChunks", $2)
                       END,
                       status = $3,
                       "updatedAt" = $4
                   WHERE id = $1"#,
                [
                    upload.id.into(),
                    (chunk_index as i32).into(),
                    UploadStatus::Uploading.as_str().into(),
                    now.into(),
                ],
            ))
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {e}")))?;
        Ok(())
    }

    pub async fn sync_chunks(db: &Storage, upload_id: &str) -> Result<()> {
        let chunk_dir = PathBuf::from(Self::CHUNK_DIR).join(upload_id);
        if !chunk_dir.exists() {
            return Ok(());
        }

        let mut actual_chunks = Vec::new();
        let mut entries = fs::read_dir(&chunk_dir).await?;
        while let Some(entry) = entries.next_entry().await? {
            let file_name = entry.file_name();
            let file_name_str = file_name.to_string_lossy();

            if file_name_str.starts_with("chunk-") && file_name_str.ends_with(".part") {
                if let Some(index_str) = file_name_str
                    .strip_prefix("chunk-")
                    .and_then(|s| s.strip_suffix(".part"))
                {
                    if let Ok(index) = index_str.parse::<i32>() {
                        actual_chunks.push(index);
                    }
                }
            }
        }

        actual_chunks.sort();
        let upload = Self::find_by_id(db, upload_id).await?;
        let status = if actual_chunks.is_empty() {
            UploadStatus::Pending
        } else {
            UploadStatus::Uploading
        };

        let mut active: uploads::ActiveModel = upload.into();
        active.uploaded_chunks = Set(actual_chunks);
        active.status = Set(status.as_str().to_string());
        active.updated_at = Set(Utc::now().fixed_offset());
        active
            .update(&db.db)
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {e}")))?;

        Ok(())
    }

    async fn mark_completed(db: &Storage, upload: &uploads::Model, file_path: &Path) -> Result<()> {
        let mut active: uploads::ActiveModel = upload.clone().into();
        active.status = Set(UploadStatus::Completed.as_str().to_string());
        active.storage_path = Set(Some(file_path.to_string_lossy().into_owned()));
        active.updated_at = Set(Utc::now().fixed_offset());
        active
            .update(&db.db)
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {e}")))?;
        Ok(())
    }

    async fn mark_failed(db: &Storage, upload: uploads::Model) -> Result<()> {
        let mut active: uploads::ActiveModel = upload.into();
        active.status = Set(UploadStatus::Failed.as_str().to_string());
        active.updated_at = Set(Utc::now().fixed_offset());
        active
            .update(&db.db)
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {e}")))?;
        Ok(())
    }

    fn calculate_hash(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        hex_encode(hasher.finalize().as_slice())
    }

    async fn calculate_hash_of_file(file_path: &Path) -> Result<String> {
        let mut file = File::open(file_path).await?;
        let mut hasher = Sha256::new();
        let mut buffer = vec![0; 65536];

        loop {
            let bytes_read = file.read(&mut buffer).await?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }
        Ok(hex_encode(hasher.finalize().as_slice()))
    }
}

fn to_u32_chunks(chunks: &[i32]) -> Vec<u32> {
    chunks.iter().copied().map(|v| v as u32).collect()
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

pub(crate) fn sanitize_download_filename(name: &str) -> String {
    let base = name.rsplit(['/', '\\']).next().unwrap_or(name).trim();
    let sanitized: String = base
        .chars()
        .filter(|c| !c.is_control() && !matches!(c, '"' | '\\' | ';' | '/'))
        .take(200)
        .collect();
    if sanitized.is_empty() {
        "download".to_string()
    } else {
        sanitized
    }
}

#[cfg(test)]
mod tests {
    use super::sanitize_download_filename;

    #[test]
    fn strips_path_and_quotes() {
        assert_eq!(
            sanitize_download_filename(r#"..\..\evil"name.txt"#),
            "evilname.txt"
        );
    }

    #[test]
    fn empty_falls_back() {
        assert_eq!(sanitize_download_filename("///"), "download");
    }
}
