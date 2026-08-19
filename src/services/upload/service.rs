use crate::databases::database::Storage;
use crate::services::upload::schema::{
    ChunkR, FinalizeR, ProgressR, PrepareP, PrepareR, UploadStatus,
};
use actix_web::{
    Result, error::ErrorBadRequest, error::ErrorInternalServerError, error::ErrorNotFound,
};
use chrono::{Duration, Utc};
use entity::asset;
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
     // 5GB
    const MAX_FILE_SIZE: u64 = 5 * 1024 * 1024 * 1024;
    // 1MB
    const MIN_CHUNK_SIZE: u32 = 1024 * 1024;
    const MAX_CHUNK_SIZE: u32 = 10 * 1024 * 1024;
    const EXPIRE_HOURS: i64 = 24;
    const FILE_URL_PREFIX: &'static str = "/api/v1/upload/files";
    const KIND: &'static str = "upload";

    pub async fn prepare(
        db: &Storage,
        req: PrepareP,
        creator: Option<String>,
    ) -> Result<PrepareR> {
        Self::validate(&req)?;

        if let Some(existing) = Self::find_completed(db, &req.hash).await? {
            return Ok(PrepareR {
                id: existing.id.to_string(),
                exists: true,
                chunks: vec![],
                url: "/api/v1/upload/chunk".to_string(),
            });
        }

        if let Some(existing) = Self::find_pending(db, &req.hash, creator.as_deref()).await? {
            return Ok(PrepareR {
                id: existing.id.to_string(),
                exists: false,
                chunks: to_u32_chunks(&existing.chunks),
                url: "/api/v1/upload/chunk".to_string(),
            });
        }

        let record = Self::build_record(req, creator)?;
        let inserted = record
            .insert(&db.db)
            .await
            .map_err(|e| ErrorInternalServerError(format!("数据库错误: {e}")))?;
        let id = inserted.id.to_string();
        Self::prepare_chunk_dir(&id).await?;

        Ok(PrepareR {
            id,
            exists: false,
            chunks: vec![],
            url: "/api/v1/upload/chunk".to_string(),
        })
    }

    pub async fn chunk(
        db: &Storage,
        id: &str,
        index: u32,
        data: Vec<u8>,
        hash: &str,
    ) -> Result<ChunkR> {
        let asset = Self::find_by_id(db, id).await?;
        Self::validate_status(&asset)?;
        Self::validate_chunk(&asset, index, &data, hash)?;

        if asset.chunks.contains(&(index as i32)) {
            return Ok(ChunkR {
                success: true,
                index,
                message: format!("分片 {index} 已上传"),
            });
        }

        Self::store_chunk(id, index, &data).await?;
        Self::append_chunk(db, asset, index).await?;

        Ok(ChunkR {
            success: true,
            index,
            message: format!("分片 {index} 上传成功"),
        })
    }

    pub async fn finalize(db: &Storage, id: &str) -> Result<FinalizeR> {
        Self::sync_chunks(db, id).await?;
        let asset = Self::find_by_id(db, id).await?;
        Self::validate_completion(&asset)?;
        let final_path = Self::merge_chunks(&asset).await?;
        let sha = Self::verify_integrity(&final_path, &asset.hash).await?;
        Self::mark_completed(db, &asset, &final_path, &sha).await?;
        Self::cleanup_chunks(id).await?;

        Ok(FinalizeR {
            success: true,
            url: format!("{}/{}", Self::FILE_URL_PREFIX, asset.hash),
            id: id.to_string(),
        })
    }

    pub async fn progress(db: &Storage, id: &str) -> Result<ProgressR> {
        let asset = Self::find_by_id(db, id).await?;
        let progress = if asset.total == 0 {
            0.0
        } else {
            asset.chunks.len() as f64 / asset.total as f64 * 100.0
        };

        Ok(ProgressR {
            id: id.to_string(),
            progress,
            chunks: to_u32_chunks(&asset.chunks),
            total: asset.total as u32,
            status: UploadStatus::from_db(&asset.status),
        })
    }

    fn build_record(req: PrepareP, creator: Option<String>) -> Result<asset::ActiveModel> {
        let total = (req.size + req.chunk as u64 - 1) / req.chunk as u64;
        let now = Utc::now().fixed_offset();
        let creator = match creator.as_deref() {
            Some(id) => {
                Some(Uuid::parse_str(id).map_err(|_| ErrorBadRequest("创建者 ID 无效"))?)
            }
            None => None,
        };
        let extension = Path::new(&req.name)
            .extension()
            .map(|e| e.to_string_lossy().into_owned());

        Ok(asset::ActiveModel {
            id: Set(Uuid::new_v4()),
            kind: Set(Some(Self::KIND.to_string())),
            hash: Set(req.hash),
            sha: Set(None),
            size: Set(req.size as i64),
            mime: Set(req.mime),
            extension: Set(extension),
            name: Set(req.name),
            path: Set(None),
            metadata: Set(None),
            status: Set(UploadStatus::Pending.as_str().to_string()),
            chunk: Set(req.chunk as i32),
            total: Set(total as i32),
            chunks: Set(vec![]),
            archived_at: Set(None),
            created_at: Set(now),
            creator: Set(creator),
            updated_at: Set(now),
            updater: Set(creator),
            expires_at: Set(Some(now + Duration::hours(Self::EXPIRE_HOURS))),
        })
    }

    pub async fn cancel(db: &Storage, id: &str) -> Result<()> {
        let asset = Self::find_by_id(db, id).await?;
        Self::mark_failed(db, asset).await?;
        Self::cleanup_chunks(id).await?;
        Ok(())
    }

    fn validate(req: &PrepareP) -> Result<()> {
        if req.size > Self::MAX_FILE_SIZE {
            return Err(ErrorBadRequest(format!(
                "文件大小超过 {}GB 限制",
                Self::MAX_FILE_SIZE / (1024 * 1024 * 1024)
            )));
        }

        if req.chunk < Self::MIN_CHUNK_SIZE || req.chunk > Self::MAX_CHUNK_SIZE {
            return Err(ErrorBadRequest(format!(
                "分片大小须在 {}MB 至 {}MB 之间",
                Self::MIN_CHUNK_SIZE / (1024 * 1024),
                Self::MAX_CHUNK_SIZE / (1024 * 1024)
            )));
        }

        if req.size == 0 {
            return Err(ErrorBadRequest("文件大小必须大于 0"));
        }

        if req.name.trim().is_empty() {
            return Err(ErrorBadRequest("文件名不能为空"));
        }

        if req.hash.len() != 64 {
            return Err(ErrorBadRequest("文件哈希格式无效"));
        }

        Ok(())
    }

    fn validate_status(asset: &asset::Model) -> Result<()> {
        if asset.archived_at.is_some() {
            return Err(ErrorBadRequest("资源已归档"));
        }

        if asset
            .expires_at
            .is_some_and(|expires_at| expires_at < Utc::now().fixed_offset())
        {
            return Err(ErrorBadRequest("上传已过期"));
        }

        match UploadStatus::from_db(&asset.status) {
            UploadStatus::Pending | UploadStatus::Uploading => Ok(()),
            UploadStatus::Completed => Err(ErrorBadRequest("上传已完成")),
            UploadStatus::Failed => Err(ErrorBadRequest("上传已失败，无法继续")),
            UploadStatus::Expired => Err(ErrorBadRequest("上传已过期")),
        }
    }

    fn validate_chunk(
        asset: &asset::Model,
        index: u32,
        data: &[u8],
        hash: &str,
    ) -> Result<()> {
        if index >= asset.total as u32 {
            return Err(ErrorBadRequest(format!("分片索引无效: {index}")));
        }

        let calculated_hash = Self::calculate_hash(data);
        if calculated_hash != hash {
            return Err(ErrorBadRequest(format!(
                "分片哈希不匹配：期望 {hash}，实际 {calculated_hash}"
            )));
        }

        let expected_size = if index == asset.total as u32 - 1 {
            let remaining = asset.size as u64 % asset.chunk as u64;
            if remaining == 0 {
                asset.chunk as usize
            } else {
                remaining as usize
            }
        } else {
            asset.chunk as usize
        };

        if data.len() != expected_size {
            return Err(ErrorBadRequest(format!(
                "分片大小不匹配：期望 {}，实际 {}",
                expected_size,
                data.len()
            )));
        }
        Ok(())
    }

    fn validate_completion(asset: &asset::Model) -> Result<()> {
        if asset.chunks.len() != asset.total as usize {
            return Err(ErrorBadRequest(format!(
                "上传未完成，缺少分片：{} / {}",
                asset.chunks.len(),
                asset.total
            )));
        }

        let mut sorted = asset.chunks.clone();
        sorted.sort();

        for (i, &chunk_index) in sorted.iter().enumerate() {
            if chunk_index != i as i32 {
                return Err(ErrorBadRequest(format!(
                    "缺少分片索引 {i}：期望 {i}，实际 {chunk_index}"
                )));
            }
        }

        Ok(())
    }

    async fn find_completed(db: &Storage, hash: &str) -> Result<Option<asset::Model>> {
        asset::Entity::find()
            .filter(asset::Column::Hash.eq(hash))
            .filter(asset::Column::Status.eq(UploadStatus::Completed.as_str()))
            .filter(asset::Column::ArchivedAt.is_null())
            .one(&db.db)
            .await
            .map_err(|e| ErrorInternalServerError(format!("数据库错误: {e}")))
    }

    pub async fn find_file_by_hash(db: &Storage, hash: &str) -> Result<Option<asset::Model>> {
        Self::find_completed(db, hash).await
    }

    async fn find_pending(
        db: &Storage,
        hash: &str,
        creator: Option<&str>,
    ) -> Result<Option<asset::Model>> {
        let Some(creator) = creator else {
            return Ok(None);
        };
        let creator =
            Uuid::parse_str(creator).map_err(|_| ErrorBadRequest("创建者 ID 无效"))?;
        let now = Utc::now().fixed_offset();

        asset::Entity::find()
            .filter(asset::Column::Hash.eq(hash))
            .filter(asset::Column::Creator.eq(creator))
            .filter(asset::Column::ArchivedAt.is_null())
            .filter(asset::Column::Status.is_in([
                UploadStatus::Pending.as_str(),
                UploadStatus::Uploading.as_str(),
            ]))
            .filter(
                Condition::any()
                    .add(asset::Column::ExpiresAt.is_null())
                    .add(asset::Column::ExpiresAt.gt(now)),
            )
            .one(&db.db)
            .await
            .map_err(|e| ErrorInternalServerError(format!("数据库错误: {e}")))
    }

    async fn find_by_id(db: &Storage, id: &str) -> Result<asset::Model> {
        let id = Uuid::parse_str(id).map_err(|_| ErrorBadRequest("资源 ID 无效"))?;
        asset::Entity::find_by_id(id)
            .one(&db.db)
            .await
            .map_err(|e| ErrorInternalServerError(format!("数据库错误: {e}")))?
            .ok_or_else(|| ErrorNotFound("资源不存在"))
    }

    async fn prepare_chunk_dir(id: &str) -> Result<()> {
        let chunk_dir = PathBuf::from(Self::CHUNK_DIR).join(id);
        fs::create_dir_all(&chunk_dir).await?;
        Ok(())
    }

    async fn store_chunk(id: &str, index: u32, data: &[u8]) -> Result<()> {
        let chunk_path = PathBuf::from(Self::CHUNK_DIR)
            .join(id)
            .join(format!("chunk-{index}.part"));
        let mut chunk_file = File::create(&chunk_path).await?;
        chunk_file.write_all(data).await?;
        Ok(())
    }

    async fn merge_chunks(asset: &asset::Model) -> Result<PathBuf> {
        let id = asset.id.to_string();
        let final_path = PathBuf::from(Self::UPLOAD_DIR).join(format!("{}-{}", id, asset.name));

        if let Some(parent) = final_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        let mut final_file = File::create(&final_path).await?;
        let chunk_dir = PathBuf::from(Self::CHUNK_DIR).join(&id);

        for chunk_index in 0..asset.total {
            let chunk_path = chunk_dir.join(format!("chunk-{chunk_index}.part"));
            let mut chunk_file = File::open(&chunk_path).await?;
            let mut buffer = Vec::new();
            chunk_file.read_to_end(&mut buffer).await?;
            final_file.write_all(&buffer).await?;
        }

        final_file.flush().await?;
        Ok(final_path)
    }

    async fn verify_integrity(file_path: &Path, expected_hash: &str) -> Result<String> {
        let calculated_hash = Self::calculate_hash_of_file(file_path).await.map_err(|e| {
            ErrorInternalServerError(format!("计算文件哈希失败: {e}"))
        })?;
        if calculated_hash != expected_hash {
            let _ = fs::remove_file(file_path).await;
            return Err(ErrorInternalServerError(format!(
                "文件完整性校验失败：期望 {expected_hash}，实际 {calculated_hash}"
            )));
        }
        Ok(calculated_hash)
    }

    async fn cleanup_chunks(id: &str) -> Result<()> {
        let chunk_dir = PathBuf::from(Self::CHUNK_DIR).join(id);
        if chunk_dir.exists() {
            fs::remove_dir_all(&chunk_dir).await?;
        }
        Ok(())
    }

    async fn append_chunk(db: &Storage, asset: asset::Model, index: u32) -> Result<()> {
        let now = Utc::now().fixed_offset();
        db.db
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Postgres,
                r#"UPDATE asset
                   SET chunks = CASE
                         WHEN $2 = ANY(chunks) THEN chunks
                         ELSE array_append(chunks, $2)
                       END,
                       status = $3,
                       "updatedAt" = $4
                   WHERE id = $1"#,
                [
                    asset.id.into(),
                    (index as i32).into(),
                    UploadStatus::Uploading.as_str().into(),
                    now.into(),
                ],
            ))
            .await
            .map_err(|e| ErrorInternalServerError(format!("数据库错误: {e}")))?;
        Ok(())
    }

    pub async fn sync_chunks(db: &Storage, id: &str) -> Result<()> {
        let chunk_dir = PathBuf::from(Self::CHUNK_DIR).join(id);
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
        let asset = Self::find_by_id(db, id).await?;
        let status = if actual_chunks.is_empty() {
            UploadStatus::Pending
        } else {
            UploadStatus::Uploading
        };

        let mut active: asset::ActiveModel = asset.into();
        active.chunks = Set(actual_chunks);
        active.status = Set(status.as_str().to_string());
        active.updated_at = Set(Utc::now().fixed_offset());
        active
            .update(&db.db)
            .await
            .map_err(|e| ErrorInternalServerError(format!("数据库错误: {e}")))?;

        Ok(())
    }

    async fn mark_completed(
        db: &Storage,
        asset: &asset::Model,
        file_path: &Path,
        sha: &str,
    ) -> Result<()> {
        let mut active: asset::ActiveModel = asset.clone().into();
        active.status = Set(UploadStatus::Completed.as_str().to_string());
        active.path = Set(Some(file_path.to_string_lossy().into_owned()));
        active.sha = Set(Some(sha.to_string()));
        active.updated_at = Set(Utc::now().fixed_offset());
        active
            .update(&db.db)
            .await
            .map_err(|e| ErrorInternalServerError(format!("数据库错误: {e}")))?;
        Ok(())
    }

    async fn mark_failed(db: &Storage, asset: asset::Model) -> Result<()> {
        let now = Utc::now().fixed_offset();
        let mut active: asset::ActiveModel = asset.into();
        active.status = Set(UploadStatus::Failed.as_str().to_string());
        active.archived_at = Set(Some(now));
        active.updated_at = Set(now);
        active
            .update(&db.db)
            .await
            .map_err(|e| ErrorInternalServerError(format!("数据库错误: {e}")))?;
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
