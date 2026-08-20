use std::path::Path;

use chrono::{Duration, Utc};
use entity::asset;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait, DatabaseBackend, EntityTrait,
    QueryFilter, Set, Statement,
};
use uuid::Uuid;

use crate::databases::database::Storage;
use crate::services::upload::error::UploadError;
use crate::services::upload::schema::{PrepareP, UploadStatus};
use crate::services::upload::validation::{EXPIRE_HOURS, KIND};

pub async fn find_completed(db: &Storage, hash: &str) -> Result<Option<asset::Model>, UploadError> {
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

    Ok(asset::ActiveModel {
        id: Set(Uuid::new_v4()),
        kind: Set(Some(KIND.to_string())),
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
        expires_at: Set(Some(now + Duration::hours(EXPIRE_HOURS))),
    })
}

pub async fn insert(db: &Storage, record: asset::ActiveModel) -> Result<asset::Model, UploadError> {
    record
        .insert(&db.db)
        .await
        .map_err(|e| UploadError::Database(e.to_string()))
}

pub async fn append_chunk(
    db: &Storage,
    asset: asset::Model,
    index: u32,
) -> Result<(), UploadError> {
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
        .map_err(|e| UploadError::Database(e.to_string()))?;
    Ok(())
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
    file_path: &Path,
    sha: &str,
) -> Result<(), UploadError> {
    let mut active: asset::ActiveModel = asset.clone().into();
    active.status = Set(UploadStatus::Completed.as_str().to_string());
    active.path = Set(Some(file_path.to_string_lossy().into_owned()));
    active.sha = Set(Some(sha.to_string()));
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
