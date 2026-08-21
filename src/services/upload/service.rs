use entity::asset;

use crate::databases::database::Storage;
use crate::services::upload::error::UploadError;
use crate::services::upload::repository;
use crate::services::upload::schema::{
    ChunkR, FilesP, FilesR, FinalizeR, HashP, HashR, PrepareP, PrepareR, ProgressR, UploadStatus,
};
use crate::services::upload::storage;
use crate::services::upload::validation::{self, normalize_hash};

pub struct UploadService;

impl UploadService {
    pub async fn prepare(
        db: &Storage,
        req: PrepareP,
        creator: Option<String>,
    ) -> Result<PrepareR, UploadError> {
        validation::validate_prepare(&req)?;

        if let Some(hash) = normalize_hash(req.hash.as_deref()) {
            if let Some(creator_id) = creator.as_deref() {
                if let Some(mine) = repository::find_completed_owned(db, hash, creator_id).await? {
                    if Self::prepare_layout_ok(&req, &mine) {
                        return repository::prepare_response(db, &mine, true).await;
                    }
                }
            }

            if let Some(existing) = repository::find_completed(db, hash).await? {
                if let Some(creator_id) = creator.as_deref() {
                    if Self::prepare_layout_ok(&req, &existing) {
                        let cloned = repository::clone_completed_for(
                            db,
                            &existing,
                            creator_id,
                            &req.name,
                        )
                        .await?;
                        return repository::prepare_response(db, &cloned, true).await;
                    }
                } else if Self::prepare_layout_ok(&req, &existing) {
                    return repository::prepare_response(db, &existing, true).await;
                }
            }

            if let Some(existing) =
                repository::find_pending(db, hash, creator.as_deref()).await?
            {
                return repository::prepare_response(db, &existing, false).await;
            }
        }

        let record = repository::build_record(req, creator)?;
        let inserted = repository::insert(db, record).await?;
        storage::ensure_cas_dir().await?;
        repository::prepare_response(db, &inserted, false).await
    }

    pub async fn bind_hash(
        db: &Storage,
        req: HashP,
        user_id: &str,
    ) -> Result<HashR, UploadError> {
        validation::validate_hash_hex(&req.hash)?;
        let asset = Self::load_owned(db, &req.id, user_id).await?;
        validation::validate_status(&asset)?;

        if let Some(mine) = repository::find_completed_owned(db, &req.hash, user_id).await? {
            if repository::layout_matches(&asset, &mine) {
                repository::discard_session(db, asset).await?;
                let uploaded = repository::uploaded_list(db, mine.id).await?;
                return Ok(HashR {
                    id: mine.id.to_string(),
                    exists: true,
                    chunks: uploaded.iter().map(|c| c.index).collect(),
                    uploaded,
                });
            }
        }

        if let Some(existing) = repository::find_completed(db, &req.hash).await? {
            if repository::layout_matches(&asset, &existing) {
                let name = asset.name.clone();
                repository::discard_session(db, asset).await?;
                let cloned =
                    repository::clone_completed_for(db, &existing, user_id, &name).await?;
                let uploaded = repository::uploaded_list(db, cloned.id).await?;
                return Ok(HashR {
                    id: cloned.id.to_string(),
                    exists: true,
                    chunks: uploaded.iter().map(|c| c.index).collect(),
                    uploaded,
                });
            }
        }

        if !asset.hash.is_empty() && asset.hash != req.hash {
            return Err(UploadError::BadRequest(
                "会话已绑定其他文件哈希，无法更改".into(),
            ));
        }

        // 同 hash 另有未完成会话：丢掉*空闲*旧会话，保留当前正在传的会话。
        // 切勿 discard 当前会话再切到旧 PENDING——客户端仍在用旧 id 传分片会中途「会话已结束」。
        if let Some(pending) = repository::find_pending(db, &req.hash, Some(user_id)).await? {
            if pending.id != asset.id {
                repository::discard_session(db, pending).await?;
            }
        }

        let updated = repository::bind_hash(db, asset, &req.hash).await?;
        let uploaded = repository::uploaded_list(db, updated.id).await?;
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

        if let Some(existing) = repository::find_chunk(db, asset.id, index).await? {
            if existing.hash == hash {
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

        let (reused, size) = if storage::cas_exists(hash).await {
            let len = storage::cas_len(hash).await? as usize;
            validation::validate_chunk_size(&asset, index, len)?;
            if let Some(ref bytes) = data {
                if !bytes.is_empty() {
                    let calculated = storage::calculate_hash(bytes);
                    validation::validate_chunk_hash(hash, &calculated)?;
                    validation::validate_chunk_size(&asset, index, bytes.len())?;
                }
            }
            (true, len as i64)
        } else {
            let Some(bytes) = data.filter(|b| !b.is_empty()) else {
                return Err(UploadError::BadRequest(
                    "分片在 CAS 中不存在，必须上传 chunk 数据".into(),
                ));
            };
            let calculated = storage::calculate_hash(&bytes);
            validation::validate_chunk(&asset, index, &bytes, hash, &calculated)?;
            let reused = storage::store_cas(hash, &bytes).await?;
            (reused, bytes.len() as i64)
        };

        repository::upsert_chunk(db, &asset, index, hash, size, Some(user_id)).await?;

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
        let uploaded = repository::count_chunks(db, asset.id).await?;
        validation::validate_completion(&asset, uploaded)?;
        let chunk_hashes = repository::ordered_chunk_hashes(db, &asset).await?;
        storage::ensure_cas_present(&chunk_hashes).await?;
        let sha = storage::verify_chunks_integrity(&chunk_hashes, &asset.hash).await?;
        repository::mark_completed(db, &asset, &sha).await?;

        Ok(FinalizeR {
            success: true,
            url: repository::file_url_by_id(&asset.id),
            id: id.to_string(),
        })
    }

    pub async fn progress(db: &Storage, id: &str, user_id: &str) -> Result<ProgressR, UploadError> {
        let asset = Self::load_owned(db, id, user_id).await?;
        let uploaded = repository::uploaded_list(db, asset.id).await?;
        let progress = if asset.total == 0 {
            0.0
        } else {
            uploaded.len() as f64 / asset.total as f64 * 100.0
        };

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
        if UploadStatus::from_db(&asset.status) == UploadStatus::Completed {
            return Err(UploadError::BadRequest("已完成的资产不能取消".into()));
        }
        repository::discard_session(db, asset).await?;
        Ok(())
    }

    pub async fn toRead_files(
        db: &Storage,
        user_id: &str,
        query: FilesP,
    ) -> Result<FilesR, UploadError> {
        let page = query.page.unwrap_or(1).max(1);
        let size = query.size.unwrap_or(20).clamp(1, 100);
        let (items, count) =
            repository::list_owned(db, user_id, page, size, query.status.as_ref()).await?;
        Ok(FilesR::from_page(items, count, page, size))
    }

    pub async fn find_file_for_download(
        db: &Storage,
        hash: &str,
        user_id: &str,
    ) -> Result<Option<asset::Model>, UploadError> {
        repository::find_file_for_download(db, hash, user_id).await
    }

    pub async fn find_owned_asset(
        db: &Storage,
        id: &str,
        user_id: &str,
    ) -> Result<asset::Model, UploadError> {
        let asset = Self::load_owned(db, id, user_id).await?;
        if UploadStatus::from_db(&asset.status) != UploadStatus::Completed {
            return Err(UploadError::BadRequest("文件尚未完成上传".into()));
        }
        Ok(asset)
    }

    pub async fn stream_hashes_for_asset(
        db: &Storage,
        asset: &asset::Model,
    ) -> Result<Vec<String>, UploadError> {
        let hashes = repository::ordered_chunk_hashes(db, asset).await?;
        storage::ensure_cas_present(&hashes).await?;
        Ok(hashes)
    }

    fn prepare_layout_ok(req: &PrepareP, existing: &asset::Model) -> bool {
        req.size as i64 == existing.size && req.chunk as i32 == existing.chunk
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
