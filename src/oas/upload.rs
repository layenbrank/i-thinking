use crate::services::upload::schema::FinalizeP;
use super::common::{
    ChunkUploadEnvelope, ChunkUploadForm, Exception, FinalizeUploadEnvelope, UploadPrepareEnvelope,
    UploadProgressEnvelope,
};

/// 初始化分片上传
#[utoipa::path(
    post,
    path = "/api/v1/upload/prepare",
    tag = "Upload",
    operation_id = "upload.prepare",
    summary = "初始化上传",
    description = "创建上传会话，返回 upload id 与已上传分片列表。需要 JWT 鉴权。",
    security(("bearer_auth" = [])),
    request_body = crate::services::upload::schema::PrepareP,
    responses(
        (status = 200, description = "初始化成功（code=200000）", body = UploadPrepareEnvelope),
        (status = 200, description = "未登录或参数错误", body = Exception),
    )
)]
pub fn prepare_upload_doc() {}

/// 上传分片
#[utoipa::path(
    post,
    path = "/api/v1/upload/chunk",
    tag = "Upload",
    operation_id = "upload.chunk",
    summary = "上传分片",
    description = "multipart/form-data 上传单个分片。需要 JWT 鉴权。",
    security(("bearer_auth" = [])),
    request_body(content = ChunkUploadForm, content_type = "multipart/form-data"),
    responses(
        (status = 200, description = "分片上传成功（code=200000）", body = ChunkUploadEnvelope),
        (status = 200, description = "未登录或分片错误", body = Exception),
    )
)]
pub fn chunk_upload_doc() {}

/// 完成上传
#[utoipa::path(
    post,
    path = "/api/v1/upload/finalize",
    tag = "Upload",
    operation_id = "upload.finalize",
    summary = "完成上传",
    description = "合并所有分片并完成上传。需要 JWT 鉴权。",
    security(("bearer_auth" = [])),
    request_body = FinalizeP,
    responses(
        (status = 200, description = "上传完成（code=200000）", body = FinalizeUploadEnvelope),
        (status = 200, description = "未登录或校验失败", body = Exception),
    )
)]
pub fn finalize_upload_doc() {}

/// 查询上传进度
#[utoipa::path(
    get,
    path = "/api/v1/upload/progress/{id}",
    tag = "Upload",
    operation_id = "upload.progress",
    summary = "查询上传进度",
    security(("bearer_auth" = [])),
    params(
        ("id" = String, Path, description = "上传会话 ID")
    ),
    responses(
        (status = 200, description = "查询成功（code=200000）", body = UploadProgressEnvelope),
        (status = 200, description = "未登录或会话不存在", body = Exception),
    )
)]
pub fn progress_upload_doc() {}

/// 取消上传
#[utoipa::path(
    delete,
    path = "/api/v1/upload/cancel/{id}",
    tag = "Upload",
    operation_id = "upload.cancel",
    summary = "取消上传",
    security(("bearer_auth" = [])),
    params(
        ("id" = String, Path, description = "上传会话 ID")
    ),
    responses(
        (status = 200, description = "取消成功（code=200000）"),
        (status = 200, description = "未登录或会话不存在", body = Exception),
    )
)]
pub fn cancel_upload_doc() {}

/// 下载/访问已上传文件
#[utoipa::path(
    get,
    path = "/api/v1/upload/files/{hash}",
    tag = "Upload",
    operation_id = "upload.serveFile",
    summary = "访问已上传文件",
    description = "通过文件 hash 下载，无需 JWT（公开访问）。",
    params(
        ("hash" = String, Path, description = "文件 SHA-256 hash")
    ),
    responses(
        (status = 200, description = "文件二进制流", content_type = "application/octet-stream"),
        (status = 200, description = "文件不存在（code=500204）", body = Exception),
    )
)]
pub fn serve_file_doc() {}
