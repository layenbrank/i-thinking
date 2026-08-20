use std::collections::BTreeMap;
use std::path::Path;

use chrono::{Duration, Utc};
use entity::asset;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait, DatabaseBackend, EntityTrait,
    QueryFilter, Set, Statement,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::databases::database::Storage;
use crate::services::upload::error::UploadError;
use crate::services::upload::schema::{PrepareP, UploadStatus, UploadedChunk};
use crate::services::upload::validation::{EXPIRE_HOURS, KIND, normalize_hash};

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AssetMeta {
    #[serde(default)]
    chunk_hashes: BTreeMap<String, String>,
}

pub async fn find_completed(db: &Storage, hash: &str) -> Result<Option<asset::Model>, UploadError> {
    if normalize_hash(Some(hash)).is_none() {
        return Ok(None);
    }
    asset::Entity::find()
        .filter(asset::Column::Hash.eq(hash))
        .filter(asset::Column::Status.eq(UploadStatus::Completed.as_str()))
        .filter(asset::Column::ArchivedAt.is_null())
        .one(&db.db)
        .await
        .map_err(|e| UploadError::Database(e.to_string()))
}

pub async fn find_file_by_hash(
    db: &Storage,
    hash: &str,
) -> Result<Option<asset::Model>, UploadError> {
    find_completed(db, hash).await
}

pub async fn find_pending(
    db: &Storage,
    hash: &str,
    creator: Option<&str>,
) -> Result<Option<asset::Model>, UploadError> {
    if normalize_hash(Some(hash)).is_none() {
        return Ok(None);
    }
    let Some(creator) = creator else {
        return Ok(None);
    };
    let creator = UploadError::parse_user_id(creator)?;
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
        .map_err(|e| UploadError::Database(e.to_string()))
}

pub async fn find_by_id(db: &Storage, id: &str) -> Result<asset::Model, UploadError> {
    let id = UploadError::parse_asset_id(id)?;
    asset::Entity::find_by_id(id)
        .one(&db.db)
        .await
        .map_err(|e| UploadError::Database(e.to_string()))?
        .ok_or(UploadError::NotFound)
}

pub fn build_record(
    req: PrepareP,
    creator: Option<String>,
) -> Result<asset::ActiveModel, UploadError> {
    let total = (req.size + req.chunk as u64 - 1) / req.chunk as u64;
    let now = Utc::now().fixed_offset();
    let creator = match creator.as_deref() {
        Some(id) => Some(UploadError::parse_user_id(id)?),
        None => None,
    };
    let extension = Path::new(&req.name)
        .extension()
        .map(|e| e.to_string_lossy().into_owned());
    let hash = normalize_hash(req.hash.as_deref())
        .unwrap_or("")
        .to_string();

    Ok(asset::ActiveModel {
        id: Set(Uuid::new_v4()),
        kind: Set(Some(KIND.to_string())),
        hash: Set(hash),
        sha: Set(None),
        size: Set(req.size as i64),
        mime: Set(req.mime),
        extension: Set(extension),
        name: Set(req.name),
        path: Set(None),
        metadata: Set(Some(
            serde_json::to_string(&AssetMeta::default())
                .map_err(|e| UploadError::Internal(e.to_string()))?,
        )),
        status: Set(UploadStatus::Pending.as_str().to_string()),
        chunk: Set(req.chunk as i32),
        total: Set(total as i32),
        chunks: Set(vec![]),
        archived_at: Set(None),
        created_at: Set(now),
        creator: Set(creator),
        updated_at: Set(now),
        updater: Set(creator),
        expires_at: Set(Some(now + Duration::hours(EXPIRE_HOURS))),
    })
}

pub async fn insert(db: &Storage, record: asset::ActiveModel) -> Result<asset::Model, UploadError> {
    record
        .insert(&db.db)
        .await
        .map_err(|e| UploadError::Database(e.to_string()))
}

fn parse_meta(raw: &Option<String>) -> AssetMeta {
    raw.as_deref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default()
}

pub fn chunk_hashes_map(asset: &asset::Model) -> BTreeMap<u32, String> {
    let meta = parse_meta(&asset.metadata);
    meta.chunk_hashes
        .into_iter()
        .filter_map(|(k, v)| k.parse::<u32>().ok().map(|i| (i, v)))
        .collect()
}

pub fn uploaded_list(asset: &asset::Model) -> Vec<UploadedChunk> {
    let map = chunk_hashes_map(asset);
    let mut indices = asset.chunks.clone();
    indices.sort();
    indices
        .into_iter()
        .filter_map(|i| {
            let index = i as u32;
            map.get(&index).map(|hash| UploadedChunk {
                index,
                hash: hash.clone(),
            })
        })
        .collect()
}

/// 按 0..total-1 顺序返回分片 hash；缺任一则 Err。
pub fn ordered_chunk_hashes(asset: &asset::Model) -> Result<Vec<String>, UploadError> {
    let map = chunk_hashes_map(asset);
    let mut out = Vec::with_capacity(asset.total as usize);
    for i in 0..asset.total as u32 {
        let Some(hash) = map.get(&i) else {
            return Err(UploadError::BadRequest(format!("缺少分片 {i} 的 hash 记录")));
        };
        out.push(hash.clone());
    }
    Ok(out)
}

pub async fn append_chunk(
    db: &Storage,
    asset: asset::Model,
    index: u32,
    chunk_hash: &str,
) -> Result<asset::Model, UploadError> {
    let mut meta = parse_meta(&asset.metadata);
    meta.chunk_hashes
        .insert(index.to_string(), chunk_hash.to_string());
    let metadata = serde_json::to_string(&meta)
        .map_err(|e| UploadError::Internal(e.to_string()))?;

    let now = Utc::now().fixed_offset();
    db.db
        .execute_raw(Statement::from_sql_and_values(
            DatabaseBackend::Postgres,
            r#"UPDATE asset
               SET chunks = CASE
                     WHEN $2 = ANY(chunks) THEN chunks
                     ELSE array_append(chunks, $2)
                   END,
                   metadata = $3,
                   status = $4,
                   "updatedAt" = $5
               WHERE id = $1"#,
            [
                asset.id.into(),
                (index as i32).into(),
                metadata.into(),
                UploadStatus::Uploading.as_str().into(),
                now.into(),
            ],
        ))
        .await
        .map_err(|e| UploadError::Database(e.to_string()))?;

    find_by_id(db, &asset.id.to_string()).await
}

pub async fn bind_hash(
    db: &Storage,
    asset: asset::Model,
    hash: &str,
) -> Result<asset::Model, UploadError> {
    let mut active: asset::ActiveModel = asset.into();
    active.hash = Set(hash.to_string());
    active.updated_at = Set(Utc::now().fixed_offset());
    active
        .update(&db.db)
        .await
        .map_err(|e| UploadError::Database(e.to_string()))
}

pub async fn save_chunks(
    db: &Storage,
    asset: asset::Model,
    actual_chunks: Vec<i32>,
) -> Result<asset::Model, UploadError> {
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
        .map_err(|e| UploadError::Database(e.to_string()))
}

pub async fn mark_completed(
    db: &Storage,
    asset: &asset::Model,
    sha: &str,
) -> Result<(), UploadError> {
    let mut active: asset::ActiveModel = asset.clone().into();
    active.status = Set(UploadStatus::Completed.as_str().to_string());
    // 不分片合并落盘；下载时按 metadata 流式拼接 CAS
    active.path = Set(None);
    active.sha = Set(Some(sha.to_string()));
    active.expires_at = Set(None);
    active.updated_at = Set(Utc::now().fixed_offset());
    active
        .update(&db.db)
        .await
        .map_err(|e| UploadError::Database(e.to_string()))?;
    Ok(())
}

pub async fn mark_failed(db: &Storage, asset: asset::Model) -> Result<(), UploadError> {
    let now = Utc::now().fixed_offset();
    let mut active: asset::ActiveModel = asset.into();
    active.status = Set(UploadStatus::Failed.as_str().to_string());
    active.archived_at = Set(Some(now));
    active.updated_at = Set(now);
    active
        .update(&db.db)
        .await
        .map_err(|e| UploadError::Database(e.to_string()))?;
    Ok(())
}

pub fn to_u32_chunks(chunks: &[i32]) -> Vec<u32> {
    chunks.iter().copied().map(|v| v as u32).collect()
}

pub fn prepare_response(asset: &asset::Model, exists: bool) -> crate::services::upload::schema::PrepareR {
    let uploaded = uploaded_list(asset);
    crate::services::upload::schema::PrepareR {
        id: asset.id.to_string(),
        exists,
        chunks: uploaded.iter().map(|c| c.index).collect(),
        uploaded,
        url: "/api/v1/upload/chunk".to_string(),
    }
}
