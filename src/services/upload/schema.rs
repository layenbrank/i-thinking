use crate::utils::datetime_serde::{deserialize_datetime, serialize_datetime};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Upload {
    pub id: ObjectId,
    pub file_name: String,
    pub file_size: u64,

    // 文件的MD5哈希
    pub file_hash: String,
    pub mime_type: String,
    pub chunk_size: u32,
    pub total_chunks: u32,

    // 已上传的分片编号
    pub uploaded_chunks: Vec<u32>,
    pub upload_status: UploadStatus,

    // 最终文件存储路径
    pub storage_path: Option<String>,

    // 上传者ID
    pub uploader_id: Option<ObjectId>,

    #[serde(
        serialize_with = "serialize_datetime",
        deserialize_with = "deserialize_datetime"
    )]
    pub created_at: mongodb::bson::DateTime,
    #[serde(
        serialize_with = "serialize_datetime",
        deserialize_with = "deserialize_datetime"
    )]
    pub updated_at: mongodb::bson::DateTime,
    pub expires_at: Option<mongodb::bson::DateTime>, // 过期时间
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum UploadStatus {
    Pending,   // 等待上传
    Uploading, // 上传中
    Completed, // 上传完成
    Failed,    // 上传失败
    Expired,   // 已过期
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
    pub progress: f32, // 0.0 - 1.0
    pub uploaded_chunks: Vec<u32>,
    pub total_chunks: u32,
    pub status: UploadStatus,
}
