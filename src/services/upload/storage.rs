use std::path::{Path, PathBuf};

use entity::asset;
use sha2::{Digest, Sha256};
use tokio::fs::{self, File};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

use crate::services::upload::error::UploadError;
use crate::services::upload::validation::{CHUNK_DIR, UPLOAD_DIR};

pub async fn prepare_chunk_dir(id: &str) -> Result<(), UploadError> {
    let chunk_dir = PathBuf::from(CHUNK_DIR).join(id);
    fs::create_dir_all(&chunk_dir).await?;
    Ok(())
}

pub async fn store_chunk(id: &str, index: u32, data: &[u8]) -> Result<(), UploadError> {
    let chunk_path = PathBuf::from(CHUNK_DIR)
        .join(id)
        .join(format!("chunk-{index}.part"));
    let mut chunk_file = File::create(&chunk_path).await?;
    chunk_file.write_all(data).await?;
    Ok(())
}

pub async fn merge_chunks(asset: &asset::Model) -> Result<PathBuf, UploadError> {
    let id = asset.id.to_string();
    let final_path = stored_path(&id, &asset.name)?;

    if let Some(parent) = final_path.parent() {
        fs::create_dir_all(parent).await?;
    }

    let mut final_file = File::create(&final_path).await?;
    let chunk_dir = PathBuf::from(CHUNK_DIR).join(&id);

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

/// 落盘路径：`uploads/{id}-{safe_name}`，拒绝跳出 `UPLOAD_DIR`。
pub fn stored_path(id: &str, name: &str) -> Result<PathBuf, UploadError> {
    let safe = safe_filename(name);
    let path = PathBuf::from(UPLOAD_DIR).join(format!("{id}-{safe}"));
    if path
        .components()
        .any(|c| matches!(c, std::path::Component::ParentDir))
    {
        return Err(UploadError::BadRequest("文件名无效".into()));
    }
    // 规范化后仍须落在 uploads 前缀下（相对路径场景）
    let base = PathBuf::from(UPLOAD_DIR);
    if !path.starts_with(&base) {
        return Err(UploadError::BadRequest("文件名无效".into()));
    }
    Ok(path)
}

pub async fn cleanup_chunks(id: &str) -> Result<(), UploadError> {
    let chunk_dir = PathBuf::from(CHUNK_DIR).join(id);
    if chunk_dir.exists() {
        fs::remove_dir_all(&chunk_dir).await?;
    }
    Ok(())
}

pub fn calculate_hash(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex_encode(hasher.finalize().as_slice())
}

pub async fn file_sha256(file_path: &Path) -> Result<String, UploadError> {
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

pub async fn verify_integrity(
    file_path: &Path,
    expected_hash: &str,
) -> Result<String, UploadError> {
    let calculated_hash = file_sha256(file_path)
        .await
        .map_err(|e| UploadError::Internal(format!("计算文件哈希失败: {e}")))?;
    if calculated_hash != expected_hash {
        let _ = fs::remove_file(file_path).await;
        return Err(UploadError::ChecksumFailed);
    }
    Ok(calculated_hash)
}

pub async fn list_chunk_indices(id: &str) -> Result<Vec<i32>, UploadError> {
    let chunk_dir = PathBuf::from(CHUNK_DIR).join(id);
    if !chunk_dir.exists() {
        return Ok(vec![]);
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
    Ok(actual_chunks)
}

pub fn safe_filename(name: &str) -> String {
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

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_path_and_quotes() {
        assert_eq!(safe_filename(r#"..\..\evil"name.txt"#), "evilname.txt");
    }

    #[test]
    fn empty_falls_back() {
        assert_eq!(safe_filename("///"), "download");
    }

    #[test]
    fn stored_path_stays_under_upload_dir() {
        let id = "550e8400-e29b-41d4-a716-446655440000";
        let path = stored_path(id, "../../etc/passwd").unwrap();
        assert!(path.starts_with(UPLOAD_DIR));
        let name = path.file_name().unwrap().to_string_lossy();
        assert_eq!(name, format!("{id}-passwd"));
        assert!(!path
            .components()
            .any(|c| matches!(c, std::path::Component::ParentDir)));
    }
}
