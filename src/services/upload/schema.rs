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
mod status_tests {
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
    pub chunks: Vec<u32>,
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

/// 本人文件列表查询
#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct FilesP {
    /// 页码，从 1 开始，默认 1
    #[serde(default)]
    pub page: Option<u32>,
    /// 每页条数，默认 20，最大 100
    #[serde(default)]
    pub size: Option<u32>,
    /// 状态过滤；默认只返回 COMPLETED
    #[serde(default)]
    pub status: Option<UploadStatus>,
}

/// 列表中的资产摘要
#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AssetR {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub mime: String,
    pub hash: String,
    pub status: UploadStatus,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    /// 按 id 下载：`/api/v1/upload/asset/{id}`
    pub url: String,
}

/// 分页列表 data
#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct FilesR {
    pub items: Vec<AssetR>,
    pub count: u64,
    pub page: u32,
    pub size: u32,
    pub total: u32,
    pub next: bool,
    pub prev: bool,
}

impl FilesR {
    pub fn from_page(items: Vec<AssetR>, count: u64, page: u32, size: u32) -> Self {
        let page_data = crate::interceptors::envelope::Paginated::new(items, count, page, size);
        Self {
            items: page_data.items,
            count: page_data.count,
            page: page_data.page,
            size: page_data.size,
            total: page_data.total,
            next: page_data.next,
            prev: page_data.prev,
        }
    }
}
