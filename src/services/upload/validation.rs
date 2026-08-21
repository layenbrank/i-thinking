use entity::asset;

use crate::services::upload::error::UploadError;
use crate::services::upload::schema::{PrepareP, UploadStatus};

pub const CAS_DIR: &str = "cas";
pub const MAX_FILE_SIZE: u64 = 5 * 1024 * 1024 * 1024; // 5GB
pub const MIN_CHUNK_SIZE: u32 = 1024 * 1024; // 1MB
pub const MAX_CHUNK_SIZE: u32 = 10 * 1024 * 1024; // 10MB
pub const EXPIRE_HOURS: i64 = 24;
pub const FILE_URL_PREFIX: &str = "/api/v1/upload/files";
pub const ASSET_URL_PREFIX: &str = "/api/v1/upload/asset";
pub const KIND: &str = "upload";

pub fn normalize_hash(hash: Option<&str>) -> Option<&str> {
    hash.map(str::trim).filter(|h| !h.is_empty())
}

pub fn validate_hash_hex(hash: &str) -> Result<(), UploadError> {
    if hash.len() != 64 || !hash.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(UploadError::BadRequest("文件哈希格式无效".into()));
    }
    Ok(())
}

pub fn validate_prepare(req: &PrepareP) -> Result<(), UploadError> {
    if req.size > MAX_FILE_SIZE {
        return Err(UploadError::BadRequest(format!(
            "文件大小超过 {}GB 限制",
            MAX_FILE_SIZE / (1024 * 1024 * 1024)
        )));
    }

    if req.chunk < MIN_CHUNK_SIZE || req.chunk > MAX_CHUNK_SIZE {
        return Err(UploadError::BadRequest(format!(
            "分片大小须在 {}MB 至 {}MB 之间",
            MIN_CHUNK_SIZE / (1024 * 1024),
            MAX_CHUNK_SIZE / (1024 * 1024)
        )));
    }

    if req.size == 0 {
        return Err(UploadError::BadRequest("文件大小必须大于 0".into()));
    }

    if req.name.trim().is_empty() {
        return Err(UploadError::BadRequest("文件名不能为空".into()));
    }

    if let Some(hash) = normalize_hash(req.hash.as_deref()) {
        validate_hash_hex(hash)?;
    }

    Ok(())
}

pub fn validate_status(asset: &asset::Model) -> Result<(), UploadError> {
    if asset.archived_at.is_some() {
        return Err(UploadError::BadRequest("资源已归档".into()));
    }

    if asset
        .expires_at
        .is_some_and(|expires_at| expires_at < chrono::Utc::now().fixed_offset())
    {
        return Err(UploadError::BadRequest("上传已过期".into()));
    }

    match UploadStatus::from_db(&asset.status) {
        UploadStatus::Pending | UploadStatus::Uploading => Ok(()),
        UploadStatus::Completed => Err(UploadError::BadRequest("上传已完成".into())),
        UploadStatus::Failed => Err(UploadError::BadRequest("上传已失败，无法继续".into())),
        UploadStatus::Expired => Err(UploadError::BadRequest("上传已过期".into())),
    }
}

pub fn expected_chunk_size(asset: &asset::Model, index: u32) -> Result<usize, UploadError> {
    if index >= asset.total as u32 {
        return Err(UploadError::BadRequest(format!("分片索引无效: {index}")));
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
    Ok(expected_size)
}

pub fn validate_chunk_hash(hash: &str, calculated_hash: &str) -> Result<(), UploadError> {
    validate_hash_hex(hash)?;
    if calculated_hash != hash {
        return Err(UploadError::BadRequest(format!(
            "分片哈希不匹配：期望 {hash}，实际 {calculated_hash}"
        )));
    }
    Ok(())
}

pub fn validate_chunk_size(
    asset: &asset::Model,
    index: u32,
    data_len: usize,
) -> Result<(), UploadError> {
    let expected_size = expected_chunk_size(asset, index)?;
    if data_len != expected_size {
        return Err(UploadError::BadRequest(format!(
            "分片大小不匹配：期望 {expected_size}，实际 {data_len}"
        )));
    }
    Ok(())
}

pub fn validate_chunk(
    asset: &asset::Model,
    index: u32,
    data: &[u8],
    hash: &str,
    calculated_hash: &str,
) -> Result<(), UploadError> {
    validate_chunk_hash(hash, calculated_hash)?;
    validate_chunk_size(asset, index, data.len())
}

pub fn validate_completion(asset: &asset::Model, uploaded: u64) -> Result<(), UploadError> {
    if normalize_hash(Some(asset.hash.as_str())).is_none() {
        return Err(UploadError::BadRequest(
            "尚未绑定整文件哈希，请先 PATCH /upload/hash".into(),
        ));
    }
    validate_hash_hex(&asset.hash)?;

    if uploaded != asset.total as u64 {
        return Err(UploadError::BadRequest(format!(
            "上传未完成，缺少分片：{uploaded} / {}",
            asset.total
        )));
    }

    Ok(())
}

pub fn ensure_owner(asset: &asset::Model, user_id: &str) -> Result<(), UploadError> {
    ensure_owner_id(asset.creator, user_id)
}

pub fn ensure_owner_id(creator: Option<uuid::Uuid>, user_id: &str) -> Result<(), UploadError> {
    let uid = UploadError::parse_user_id(user_id)?;
    match creator {
        Some(creator) if creator == uid => Ok(()),
        _ => Err(UploadError::Forbidden),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn owner_ok() {
        let id = Uuid::new_v4();
        assert!(ensure_owner_id(Some(id), &id.to_string()).is_ok());
    }

    #[test]
    fn owner_forbidden_when_missing_or_mismatch() {
        let id = Uuid::new_v4();
        assert!(matches!(
            ensure_owner_id(None, &id.to_string()),
            Err(UploadError::Forbidden)
        ));
        assert!(matches!(
            ensure_owner_id(Some(Uuid::new_v4()), &id.to_string()),
            Err(UploadError::Forbidden)
        ));
    }

    #[test]
    fn owner_rejects_invalid_user_id() {
        assert!(matches!(
            ensure_owner_id(Some(Uuid::new_v4()), "not-a-uuid"),
            Err(UploadError::InvalidCreator)
        ));
    }

    #[test]
    fn prepare_rejects_bad_hash() {
        let req = PrepareP {
            name: "a.bin".into(),
            mime: "application/octet-stream".into(),
            size: 1024,
            chunk: MIN_CHUNK_SIZE,
            hash: Some("short".into()),
        };
        assert!(matches!(
            validate_prepare(&req),
            Err(UploadError::BadRequest(_))
        ));
    }

    #[test]
    fn prepare_allows_missing_hash() {
        let req = PrepareP {
            name: "a.bin".into(),
            mime: "application/octet-stream".into(),
            size: 1024,
            chunk: MIN_CHUNK_SIZE,
            hash: None,
        };
        assert!(validate_prepare(&req).is_ok());
    }

    #[test]
    fn empty_hash_is_treated_as_unbound() {
        assert!(normalize_hash(Some("")).is_none());
        assert!(normalize_hash(Some("   ")).is_none());
        assert!(normalize_hash(None).is_none());
    }
}
