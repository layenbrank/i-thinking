use std::path::PathBuf;

use futures::stream::{self, Stream};
use futures::StreamExt;
use sha2::{Digest, Sha256};
use tokio::fs::{self, File};
use tokio::io::AsyncReadExt;

use crate::services::upload::error::UploadError;
use crate::services::upload::validation::{CAS_DIR, CHUNK_DIR};

pub async fn ensure_cas_dir() -> Result<(), UploadError> {
    fs::create_dir_all(CAS_DIR).await?;
    Ok(())
}

/// 兼容旧会话目录；新流程以 CAS + metadata 为准，可为空操作。
pub async fn prepare_chunk_dir(id: &str) -> Result<(), UploadError> {
    let chunk_dir = PathBuf::from(CHUNK_DIR).join(id);
    fs::create_dir_all(&chunk_dir).await?;
    ensure_cas_dir().await
}

pub fn cas_path(hash: &str) -> PathBuf {
    PathBuf::from(CAS_DIR).join(hash)
}

pub async fn cas_exists(hash: &str) -> bool {
    cas_path(hash).exists()
}

pub async fn cas_len(hash: &str) -> Result<u64, UploadError> {
    let meta = fs::metadata(cas_path(hash)).await?;
    Ok(meta.len())
}

/// 写入 CAS；若已存在则**不拷贝、不覆盖**（零拷贝复用）。
/// 返回 `true` 表示本次为复用已有对象。
pub async fn store_cas(hash: &str, data: &[u8]) -> Result<bool, UploadError> {
    ensure_cas_dir().await?;
    let path = cas_path(hash);
    if path.exists() {
        let existing = cas_len(hash).await?;
        if existing != data.len() as u64 {
            return Err(UploadError::BadRequest(format!(
                "CAS 对象大小不一致：期望 {}，实际 {existing}",
                data.len()
            )));
        }
        return Ok(true);
    }

    let tmp = path.with_extension("tmp");
    fs::write(&tmp, data).await?;
    match fs::rename(&tmp, &path).await {
        Ok(()) => Ok(false),
        Err(err) => {
            let _ = fs::remove_file(&tmp).await;
            if path.exists() {
                // 并发写入竞态：他方已落盘，视为复用
                Ok(true)
            } else {
                Err(UploadError::Storage(err.to_string()))
            }
        }
    }
}

pub fn calculate_hash(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex_encode(hasher.finalize().as_slice())
}

/// 按序流式读取各分片 CAS，计算整文件 SHA-256（不落盘合并）。
pub async fn verify_chunks_integrity(
    chunk_hashes: &[String],
    expected_hash: &str,
) -> Result<String, UploadError> {
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 65536];

    for hash in chunk_hashes {
        let path = cas_path(hash);
        if !path.exists() {
            return Err(UploadError::BadRequest(format!(
                "分片 CAS 缺失: {hash}"
            )));
        }
        let mut file = File::open(&path).await?;
        loop {
            let n = file.read(&mut buffer).await?;
            if n == 0 {
                break;
            }
            hasher.update(&buffer[..n]);
        }
    }

    let calculated = hex_encode(hasher.finalize().as_slice());
    if calculated != expected_hash {
        return Err(UploadError::ChecksumFailed);
    }
    Ok(calculated)
}

/// 按序流式输出 CAS 分片字节（供下载；客户端收到的是完整文件流）。
pub fn stream_cas_chunks(
    chunk_hashes: Vec<String>,
) -> impl Stream<Item = Result<actix_web::web::Bytes, std::io::Error>> {
    stream::iter(chunk_hashes).then(|hash| async move {
        let path = cas_path(&hash);
        let data = tokio::fs::read(&path).await?;
        Ok(actix_web::web::Bytes::from(data))
    })
}

/// 校验全部 CAS 分片存在。
pub async fn ensure_cas_present(chunk_hashes: &[String]) -> Result<(), UploadError> {
    for hash in chunk_hashes {
        if !cas_exists(hash).await {
            return Err(UploadError::BadRequest(format!(
                "分片 CAS 缺失: {hash}"
            )));
        }
    }
    Ok(())
}

pub async fn cleanup_chunks(id: &str) -> Result<(), UploadError> {
    let chunk_dir = PathBuf::from(CHUNK_DIR).join(id);
    if chunk_dir.exists() {
        fs::remove_dir_all(&chunk_dir).await?;
    }
    Ok(())
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
    fn cas_path_uses_hash() {
        let p = cas_path("abc");
        assert!(p.ends_with("abc"));
        assert!(p.to_string_lossy().contains(CAS_DIR));
    }

    #[test]
    fn calculate_hash_stable() {
        assert_eq!(
            calculate_hash(b"hello"),
            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        );
    }
}
