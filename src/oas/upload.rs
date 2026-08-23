use super::common::{
    ChunkUploadEnvelope, ChunkUploadForm, Exception, FinalizeUploadEnvelope, UploadFilesEnvelope,
    UploadHashEnvelope, UploadPrepareEnvelope, UploadProgressEnvelope,
};
use crate::services::upload::schema::{FinalizeP, HashP, PrepareP};

/// 初始化分片上传
#[utoipa::path(
    post,
    path = "/api/v1/upload/prepare",
    tag = "Upload",
    operation_id = "upload.prepare",
    summary = "初始化上传",
    description = "创建上传会话。`hash` 可选。文件秒传：本人已完成直接返回；他人已完成则为当前用户克隆 COMPLETED（共享 CAS）。需要 JWT。",
    security(("bearer_auth" = [])),
    request_body(
        content = PrepareP,
        description = "初始化参数；hash 可省略",
        example = json!({
            "name": "sample.pdf",
            "size": 1048576,
            "mime": "application/pdf",
            "chunk": 1048576
        })
    ),
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
    description = "为会话补绑整文件 SHA-256。命中已有 COMPLETED 时当前会话标 SUPERSEDED（不删除），返回 exists 与目标 id。在途 chunk 对 SUPERSEDED 幂等成功。需要 JWT。",
    security(("bearer_auth" = [])),
    request_body(
        content = HashP,
        description = "会话 id + 整文件 SHA-256",
        example = json!({
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        })
    ),
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
    description = "multipart：id / index / hash / chunk(可选)。分片写入全局 CAS；命中则 reused。SUPERSEDED/COMPLETED 会话幂等 200。需要 JWT。",
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
    description = "校验 chunk 表分片齐全并流式计算整文件 SHA-256；不合并落盘。返回按 asset id 的下载 URL。需要 JWT。",
    security(("bearer_auth" = [])),
    request_body(
        content = FinalizeP,
        description = "上传会话 id",
        example = json!({
            "id": "550e8400-e29b-41d4-a716-446655440000"
        })
    ),
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
    description = "SUPERSEDED 时 progress=100 并返回 superseded（目标 COMPLETED）。需要 JWT。",
    security(("bearer_auth" = [])),
    params(
        ("id" = String, Path, description = "上传会话 ID", example = "550e8400-e29b-41d4-a716-446655440000")
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
        ("id" = String, Path, description = "上传会话 ID", example = "550e8400-e29b-41d4-a716-446655440000")
    ),
    responses(
        (status = 200, description = "取消成功（code=200000）"),
        (status = 200, description = "未登录或会话不存在", body = Exception),
    )
)]
pub fn cancel_upload_doc() {}

/// 本人文件列表
#[utoipa::path(
    get,
    path = "/api/v1/upload/files",
    tag = "Upload",
    operation_id = "upload.toRead",
    summary = "本人文件列表",
    description = "按 JWT 身份返回当前用户资产列表（默认 COMPLETED），支持 page/size/status 分页过滤。",
    security(("bearer_auth" = [])),
    params(
        ("page" = Option<u32>, Query, description = "页码，从 1 开始，默认 1", example = 1),
        ("size" = Option<u32>, Query, description = "每页条数，默认 20，最大 100", example = 20),
        ("status" = Option<String>, Query, description = "状态过滤，如 COMPLETED；默认 COMPLETED", example = "COMPLETED"),
    ),
    responses(
        (status = 200, description = "查询成功（code=200000）", body = UploadFilesEnvelope),
        (status = 200, description = "未登录", body = Exception),
    )
)]
pub fn toRead_files_doc() {}

/// 按 hash 下载
#[utoipa::path(
    get,
    path = "/api/v1/upload/files/{hash}",
    tag = "Upload",
    operation_id = "upload.serveFile",
    summary = "按 hash 下载文件",
    description = "仅当前用户 COMPLETED 且同 hash 的资产可读；流式拼接 CAS。需要 JWT。",
    security(("bearer_auth" = [])),
    params(
        ("hash" = String, Path, description = "文件 SHA-256 hash", example = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
    ),
    responses(
        (status = 200, description = "文件二进制流", content_type = "application/octet-stream"),
        (status = 200, description = "文件不存在", body = Exception),
    )
)]
pub fn serve_file_doc() {}

/// 按资产 id 下载
#[utoipa::path(
    get,
    path = "/api/v1/upload/asset/{id}",
    tag = "Upload",
    operation_id = "upload.serveAsset",
    summary = "按资产 id 下载文件",
    description = "仅本人 COMPLETED 资产；按 chunk 表顺序流式输出。需要 JWT。",
    security(("bearer_auth" = [])),
    params(
        ("id" = String, Path, description = "资产 UUID", example = "550e8400-e29b-41d4-a716-446655440000")
    ),
    responses(
        (status = 200, description = "文件二进制流", content_type = "application/octet-stream"),
        (status = 200, description = "文件不存在或未完成", body = Exception),
    )
)]
pub fn serve_asset_doc() {}
