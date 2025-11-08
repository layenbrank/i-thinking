use crate::utils::timestamp::{from_ts, from_ts_opt, from_str_or_num, to_ts, to_ts_opt};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Upload {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub file_name: String,
    #[serde(deserialize_with = "from_str_or_num")]
    pub file_size: u64,
    pub file_hash: String,
    pub mime_type: String,
    #[serde(deserialize_with = "from_str_or_num")]
    pub chunk_size: u32,
    #[serde(deserialize_with = "from_str_or_num")]
    pub total_chunks: u32,

    // 已上传的分片编号
    pub uploaded_chunks: Vec<u32>,
    pub status: UploadStatus,

    // 最终文件存储路径
    pub storage_path: Option<String>,

    // 上传者ID
    pub uploader_id: Option<ObjectId>,

    #[serde(serialize_with = "to_ts", deserialize_with = "from_ts")]
    pub created_at: mongodb::bson::DateTime,
    #[serde(serialize_with = "to_ts", deserialize_with = "from_ts")]
    pub updated_at: mongodb::bson::DateTime,
    #[serde(
        serialize_with = "to_ts_opt",
        deserialize_with = "from_ts_opt",
        skip_serializing_if = "Option::is_none"
    )]
    pub expires_at: Option<mongodb::bson::DateTime>, // 过期时间
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum UploadStatus {
    Pending,   // 等待上传
    Uploading, // 上传中
    Completed, // 上传完成
    Failed,    // 上传失败
    Expired,   // 已过期
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
}

// 初始化上传请求
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadRequest {
    pub file_name: String,
    pub file_size: u64,
    pub file_hash: String,
    pub mime_type: String,
    pub chunk_size: u32,
}

// 初始化上传响应
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadResponse {
    pub upload_id: String,
    pub file_exists: bool,         // 文件是否已存在（秒传）
    pub uploaded_chunks: Vec<u32>, // 已上传的分片（断点续传）
    pub upload_url: String,        // 分片上传的URL模板
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChunkUploadRequest {
    pub upload_id: String,
    pub chunk_index: u32,
    pub chunk_hash: String, // 分片的MD5哈希
}

// 上传分片响应
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChunkUploadResponse {
    pub success: bool,
    pub chunk_index: u32,
    pub message: String,
}

// 完成上传请求
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FinalizeUploadRequest {
    pub upload_id: String,
}

// 完成上传响应
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FinalizeUploadResponse {
    pub success: bool,
    pub file_url: String,
    pub file_id: String,
}

// 上传进度响应
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadProgressResponse {
    pub upload_id: String,
    pub progress: f64, // 0.0 - 100.0
    pub uploaded_chunks: Vec<u32>,
    pub total_chunks: u32,
    pub status: UploadStatus,
}
