use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
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
                tracing::warn!(status = other, "unknown upload status");
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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadRequest {
    pub file_name: String,
    pub file_size: u64,
    pub file_hash: String,
    pub mime_type: String,
    pub chunk_size: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadResponse {
    pub upload_id: String,
    pub file_exists: bool,
    pub uploaded_chunks: Vec<u32>,
    pub upload_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChunkUploadRequest {
    pub upload_id: String,
    pub chunk_index: u32,
    pub chunk_hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChunkUploadResponse {
    pub success: bool,
    pub chunk_index: u32,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FinalizeUploadRequest {
    pub upload_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FinalizeUploadResponse {
    pub success: bool,
    pub file_url: String,
    pub file_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadProgressResponse {
    pub upload_id: String,
    pub progress: f64,
    pub uploaded_chunks: Vec<u32>,
    pub total_chunks: u32,
    pub status: UploadStatus,
}
