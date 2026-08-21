use crate::services::upload::schema::{FinalizeP, HashP};
use super::common::{
    ChunkUploadEnvelope, ChunkUploadForm, Exception, FinalizeUploadEnvelope, UploadHashEnvelope,
    UploadPrepareEnvelope, UploadProgressEnvelope,
};

/// 初始化分片上传
#[utoipa::path(
    post,
    path = "/api/v1/upload/prepare",
    tag = "Upload",
    operation_id = "upload.prepare",
    summary = "初始化上传",
    description = "创建上传会话。`hash` 可选：省略时可立刻开始传分片，稍后再 PATCH /upload/hash。\
        若提供 hash：本人已完成则秒传；他人已完成则全局秒传并为当前用户克隆 COMPLETED 记录（共享 CAS）；\
        同用户有未完成会话则返回已传分片（断点续传）。需要 JWT。",
    security(("bearer_auth" = [])),
    request_body = crate::services::upload::schema::PrepareP,
    responses(
        (status = 200, description = "初始化成功（code=200000）", body = UploadPrepareEnvelope),
        (status = 200, description = "未登录或参数错误", body = Exception),
    )
)]
pub fn prepare_upload_doc() {}

/// 绑定整文件哈希
#[utoipa::path(
    patch,
    path = "/api/v1/upload/hash",
    tag = "Upload",
    operation_id = "upload.bindHash",
    summary = "绑定整文件哈希",
    description = "为已创建的上传会话补绑整文件 SHA-256。若库中已有同 hash 完成文件则返回 exists=true（秒传）。需要 JWT。",
    security(("bearer_auth" = [])),
    request_body = HashP,
    responses(
        (status = 200, description = "绑定成功（code=200000）", body = UploadHashEnvelope),
        (status = 200, description = "未登录或参数错误", body = Exception),
    )
)]
pub fn bind_hash_doc() {}

/// 上传分片
#[utoipa::path(
    post,
    path = "/api/v1/upload/chunk",
    tag = "Upload",
    operation_id = "upload.chunk",
    summary = "上传分片",
    description = "multipart：id / index / hash / chunk(可选)。\
        分片按 SHA-256 写入全局 CAS（单副本）；若 CAS 已有该 hash 则零拷贝复用（reused=true），可不传 chunk 字节。需要 JWT。",
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
    description = "校验全部分片齐全且按序流式计算的整文件 SHA-256 与绑定 hash 一致；\
        **不合并落盘**。下载时按序流式输出各 CAS 分片。需要 JWT。",
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
    description = "按文件 hash 下载。仅当前用户自己的 COMPLETED 资产可读；\
        服务端按分片顺序流式拼接 CAS。文件秒传（全局去重）会为命中用户克隆一条记录，因此秒传后本人仍可下载。需要 JWT。",
    security(("bearer_auth" = [])),
    params(
        ("hash" = String, Path, description = "文件 SHA-256 hash")
    ),
    responses(
        (status = 200, description = "文件二进制流", content_type = "application/octet-stream"),
        (status = 200, description = "文件不存在（code=500204）", body = Exception),
    )
)]
pub fn serve_file_doc() {}
