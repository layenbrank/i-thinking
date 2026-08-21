use entity::asset;

use crate::databases::database::Storage;
use crate::services::upload::error::UploadError;
use crate::services::upload::repository;
use crate::services::upload::schema::{
    ChunkR, FinalizeR, HashP, HashR, PrepareP, PrepareR, ProgressR, UploadStatus,
};
use crate::services::upload::storage;
use crate::services::upload::validation::{self, FILE_URL_PREFIX, normalize_hash};

pub struct UploadService;

impl UploadService {
    pub async fn prepare(
        db: &Storage,
        req: PrepareP,
        creator: Option<String>,
    ) -> Result<PrepareR, UploadError> {
        validation::validate_prepare(&req)?;

        if let Some(hash) = normalize_hash(req.hash.as_deref()) {
            // 本人已完成 → 直接秒传
            if let Some(creator_id) = creator.as_deref() {
                if let Some(mine) = repository::find_completed_owned(db, hash, creator_id).await? {
                    return Ok(repository::prepare_response(&mine, true));
                }
            }

            // 他人已完成 → 全局秒传：为当前用户克隆 COMPLETED 记录（共享 CAS，不拷贝）
            if let Some(existing) = repository::find_completed(db, hash).await? {
                if let Some(creator_id) = creator.as_deref() {
                    let cloned =
                        repository::clone_completed_for(db, &existing, creator_id).await?;
                    return Ok(repository::prepare_response(&cloned, true));
                }
                return Ok(repository::prepare_response(&existing, true));
            }

            if let Some(existing) =
                repository::find_pending(db, hash, creator.as_deref()).await?
            {
                return Ok(repository::prepare_response(&existing, false));
            }
        }

        let record = repository::build_record(req, creator)?;
        let inserted = repository::insert(db, record).await?;
        let id = inserted.id.to_string();
        storage::prepare_chunk_dir(&id).await?;

        Ok(repository::prepare_response(&inserted, false))
    }

    /// 补绑整文件 hash：可触发文件秒传，或关联同 hash 未完成会话。
    pub async fn bind_hash(
        db: &Storage,
        req: HashP,
        user_id: &str,
    ) -> Result<HashR, UploadError> {
        validation::validate_hash_hex(&req.hash)?;
        let asset = Self::load_owned(db, &req.id, user_id).await?;
        validation::validate_status(&asset)?;

        // 本人已有完成件
        if let Some(mine) = repository::find_completed_owned(db, &req.hash, user_id).await? {
            repository::mark_failed(db, asset).await?;
            let uploaded = repository::uploaded_list(&mine);
            return Ok(HashR {
                id: mine.id.to_string(),
                exists: true,
                chunks: uploaded.iter().map(|c| c.index).collect(),
                uploaded,
            });
        }

        // 全局已有完成件 → 克隆给当前用户后秒传
        if let Some(existing) = repository::find_completed(db, &req.hash).await? {
            repository::mark_failed(db, asset).await?;
            let cloned = repository::clone_completed_for(db, &existing, user_id).await?;
            let uploaded = repository::uploaded_list(&cloned);
            return Ok(HashR {
                id: cloned.id.to_string(),
                exists: true,
                chunks: uploaded.iter().map(|c| c.index).collect(),
                uploaded,
            });
        }

        if !asset.hash.is_empty() && asset.hash != req.hash {
            return Err(UploadError::BadRequest(
                "会话已绑定其他文件哈希，无法更改".into(),
            ));
        }

        if let Some(pending) = repository::find_pending(db, &req.hash, Some(user_id)).await? {
            if pending.id != asset.id {
                // 同用户同 hash 已有会话：归档当前会话并切到该会话续传
                repository::mark_failed(db, asset).await?;
                let uploaded = repository::uploaded_list(&pending);
                return Ok(HashR {
                    id: pending.id.to_string(),
                    exists: false,
                    chunks: uploaded.iter().map(|c| c.index).collect(),
                    uploaded,
                });
            }
        }

        let updated = repository::bind_hash(db, asset, &req.hash).await?;
        let uploaded = repository::uploaded_list(&updated);
        Ok(HashR {
            id: updated.id.to_string(),
            exists: false,
            chunks: uploaded.iter().map(|c| c.index).collect(),
            uploaded,
        })
    }

    pub async fn chunk(
        db: &Storage,
        id: &str,
        index: u32,
        data: Option<Vec<u8>>,
        hash: &str,
        user_id: &str,
    ) -> Result<ChunkR, UploadError> {
        let asset = Self::load_owned(db, id, user_id).await?;
        validation::validate_status(&asset)?;
        validation::validate_hash_hex(hash)?;
        validation::expected_chunk_size(&asset, index)?;

        let map = repository::chunk_hashes_map(&asset);
        if asset.chunks.contains(&(index as i32)) {
            if map.get(&index).is_some_and(|h| h == hash) {
                return Ok(ChunkR {
                    success: true,
                    index,
                    reused: true,
                    message: format!("分片 {index} 已上传"),
                });
            }
            return Err(UploadError::BadRequest(format!(
                "分片 {index} 已存在但 hash 不一致，请取消后重传"
            )));
        }

        let reused = if storage::cas_exists(hash).await {
            let len = storage::cas_len(hash).await? as usize;
            validation::validate_chunk_size(&asset, index, len)?;
            if let Some(ref bytes) = data {
                if !bytes.is_empty() {
                    let calculated = storage::calculate_hash(bytes);
                    validation::validate_chunk_hash(hash, &calculated)?;
                    validation::validate_chunk_size(&asset, index, bytes.len())?;
                }
            }
            true
        } else {
            let Some(bytes) = data.filter(|b| !b.is_empty()) else {
                return Err(UploadError::BadRequest(
                    "分片在 CAS 中不存在，必须上传 chunk 数据".into(),
                ));
            };
            let calculated = storage::calculate_hash(&bytes);
            validation::validate_chunk(&asset, index, &bytes, hash, &calculated)?;
            storage::store_cas(hash, &bytes).await?
        };

        repository::append_chunk(db, asset, index, hash).await?;

        Ok(ChunkR {
            success: true,
            index,
            reused,
            message: if reused {
                format!("分片 {index} 秒传成功")
            } else {
                format!("分片 {index} 上传成功")
            },
        })
    }

    pub async fn finalize(db: &Storage, id: &str, user_id: &str) -> Result<FinalizeR, UploadError> {
        let asset = Self::load_owned(db, id, user_id).await?;
        validation::validate_completion(&asset)?;
        let chunk_hashes = repository::ordered_chunk_hashes(&asset)?;
        storage::ensure_cas_present(&chunk_hashes).await?;
        let sha = storage::verify_chunks_integrity(&chunk_hashes, &asset.hash).await?;
        repository::mark_completed(db, &asset, &sha).await?;
        // 仅清理旧式会话目录；CAS 分片保留供秒传与流式下载
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
        let uploaded = repository::uploaded_list(&asset);

        Ok(ProgressR {
            id: id.to_string(),
            progress,
            chunks: uploaded.iter().map(|c| c.index).collect(),
            uploaded,
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

    /// 下载：仅当前用户自己的 COMPLETED 资产。
    pub async fn find_file_for_download(
        db: &Storage,
        hash: &str,
        user_id: &str,
    ) -> Result<Option<asset::Model>, UploadError> {
        repository::find_file_for_download(db, hash, user_id).await
    }

    /// 校验会话归属并返回 asset。
    ///
    /// 旧版曾按 `chunks/{id}` 磁盘目录回写 `chunks` 列；新流程以
    /// `metadata.chunkHashes` + CAS 为准，不再用磁盘索引覆盖 DB，
    /// 以免出现「chunks 有 index 但缺 hash」的分裂状态。
    pub async fn sync_chunks(
        db: &Storage,
        id: &str,
        user_id: &str,
    ) -> Result<asset::Model, UploadError> {
        Self::load_owned(db, id, user_id).await
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
