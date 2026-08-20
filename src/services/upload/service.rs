use entity::asset;

use crate::databases::database::Storage;
use crate::services::upload::error::UploadError;
use crate::services::upload::repository;
use crate::services::upload::schema::{
    ChunkR, FinalizeR, PrepareP, PrepareR, ProgressR, UploadStatus,
};
use crate::services::upload::storage;
use crate::services::upload::validation::{self, FILE_URL_PREFIX};

pub struct UploadService;

impl UploadService {
    pub async fn prepare(
        db: &Storage,
        req: PrepareP,
        creator: Option<String>,
    ) -> Result<PrepareR, UploadError> {
        validation::validate_prepare(&req)?;

        if let Some(existing) = repository::find_completed(db, &req.hash).await? {
            return Ok(PrepareR {
                id: existing.id.to_string(),
                exists: true,
                chunks: vec![],
                url: "/api/v1/upload/chunk".to_string(),
            });
        }

        if let Some(existing) = repository::find_pending(db, &req.hash, creator.as_deref()).await? {
            return Ok(PrepareR {
                id: existing.id.to_string(),
                exists: false,
                chunks: repository::to_u32_chunks(&existing.chunks),
                url: "/api/v1/upload/chunk".to_string(),
            });
        }

        let record = repository::build_record(req, creator)?;
        let inserted = repository::insert(db, record).await?;
        let id = inserted.id.to_string();
        storage::prepare_chunk_dir(&id).await?;

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
        user_id: &str,
    ) -> Result<ChunkR, UploadError> {
        let asset = Self::load_owned(db, id, user_id).await?;
        validation::validate_status(&asset)?;
        let calculated = storage::calculate_hash(&data);
        validation::validate_chunk(&asset, index, &data, hash, &calculated)?;

        if asset.chunks.contains(&(index as i32)) {
            return Ok(ChunkR {
                success: true,
                index,
                message: format!("分片 {index} 已上传"),
            });
        }

        storage::store_chunk(id, index, &data).await?;
        repository::append_chunk(db, asset, index).await?;

        Ok(ChunkR {
            success: true,
            index,
            message: format!("分片 {index} 上传成功"),
        })
    }

    pub async fn finalize(db: &Storage, id: &str, user_id: &str) -> Result<FinalizeR, UploadError> {
        let asset = Self::sync_chunks(db, id, user_id).await?;
        validation::validate_completion(&asset)?;
        let final_path = storage::merge_chunks(&asset).await?;
        let sha = storage::verify_integrity(&final_path, &asset.hash).await?;
        repository::mark_completed(db, &asset, &final_path, &sha).await?;
        storage::cleanup_chunks(id).await?;

        Ok(FinalizeR {
            success: true,
            url: format!("{}/{}", FILE_URL_PREFIX, asset.hash),
            id: id.to_string(),
        })
    }

    pub async fn progress(db: &Storage, id: &str, user_id: &str) -> Result<ProgressR, UploadError> {
        let asset = Self::load_owned(db, id, user_id).await?;
        let progress = if asset.total == 0 {
            0.0
        } else {
            asset.chunks.len() as f64 / asset.total as f64 * 100.0
        };

        Ok(ProgressR {
            id: id.to_string(),
            progress,
            chunks: repository::to_u32_chunks(&asset.chunks),
            total: asset.total as u32,
            status: UploadStatus::from_db(&asset.status),
        })
    }

    pub async fn cancel(db: &Storage, id: &str, user_id: &str) -> Result<(), UploadError> {
        let asset = Self::load_owned(db, id, user_id).await?;
        repository::mark_failed(db, asset).await?;
        storage::cleanup_chunks(id).await?;
        Ok(())
    }

    pub async fn find_file_by_hash(
        db: &Storage,
        hash: &str,
    ) -> Result<Option<asset::Model>, UploadError> {
        repository::find_file_by_hash(db, hash).await
    }

    /// 按磁盘分片同步 DB，并返回已校验归属的 asset。
    pub async fn sync_chunks(
        db: &Storage,
        id: &str,
        user_id: &str,
    ) -> Result<asset::Model, UploadError> {
        let asset = Self::load_owned(db, id, user_id).await?;
        let actual_chunks = storage::list_chunk_indices(id).await?;
        repository::save_chunks(db, asset, actual_chunks).await
    }

    async fn load_owned(
        db: &Storage,
        id: &str,
        user_id: &str,
    ) -> Result<asset::Model, UploadError> {
        let asset = repository::find_by_id(db, id).await?;
        validation::ensure_owner(&asset, user_id)?;
        Ok(asset)
    }
}
