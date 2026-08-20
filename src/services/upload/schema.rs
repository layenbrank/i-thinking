use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum UploadStatus {
    Pending,
    Uploading,
    Completed,
    Failed,
    Expired,
}

impl UploadStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "PENDING",
            Self::Uploading => "UPLOADING",
            Self::Completed => "COMPLETED",
            Self::Failed => "FAILED",
            Self::Expired => "EXPIRED",
        }
    }

    pub fn from_db(s: &str) -> Self {
        match s {
            "PENDING" => Self::Pending,
            "UPLOADING" => Self::Uploading,
            "COMPLETED" => Self::Completed,
            "FAILED" => Self::Failed,
            "EXPIRED" => Self::Expired,
            other => {
                tracing::warn!(status = other, "unknown asset status");
                Self::Failed
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::UploadStatus;

    #[test]
    fn from_db_maps_known_status() {
        assert_eq!(UploadStatus::from_db("PENDING"), UploadStatus::Pending);
        assert_eq!(UploadStatus::from_db("EXPIRED"), UploadStatus::Expired);
    }

    #[test]
    fn from_db_unknown_is_failed() {
        assert_eq!(UploadStatus::from_db("bogus"), UploadStatus::Failed);
    }
}

/// 已上传分片（含 hash，供续传对比与分片秒传）
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UploadedChunk {
    pub index: u32,
    pub hash: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PrepareP {
    pub name: String,
    pub size: u64,
    /// 整文件 SHA-256；可省略，稍后再 `PATCH /upload/hash` 绑定
    #[serde(default)]
    pub hash: Option<String>,
    pub mime: String,
    pub chunk: u32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PrepareR {
    pub id: String,
    pub exists: bool,
    /// 已上传分片索引（兼容旧客户端）
    pub chunks: Vec<u32>,
    /// 已上传分片及 hash（续传对比 / 分片秒传）
    pub uploaded: Vec<UploadedChunk>,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct HashP {
    pub id: String,
    pub hash: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct HashR {
    pub id: String,
    /// 整文件已存在（秒传）
    pub exists: bool,
    pub chunks: Vec<u32>,
    pub uploaded: Vec<UploadedChunk>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ChunkR {
    pub success: bool,
    pub index: u32,
    /// 分片内容已在 CAS 中，本次未写入新字节
    pub reused: bool,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct FinalizeP {
    pub id: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct FinalizeR {
    pub success: bool,
    pub url: String,
    pub id: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProgressR {
    pub id: String,
    pub progress: f64,
    pub chunks: Vec<u32>,
    pub uploaded: Vec<UploadedChunk>,
    pub total: u32,
    pub status: UploadStatus,
}
