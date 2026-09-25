use super::common::{Exception, SearchEnvelope, SearchWriteEnvelope};
use crate::services::search::schema::WriteP;

/// 索引文档到 Elasticsearch
#[utoipa::path(
    post,
    path = "/api/v1/search/docs",
    tag = "Search",
    operation_id = "search.toWrite",
    summary = "索引文档",
    description = "需要 JWT。将文档写入 Elasticsearch（示范搜索投影，不以 ES 为权威库）。",
    security(("bearer_auth" = [])),
    request_body(
        content = WriteP,
        description = "待索引文档",
        example = json!({
            "id": "doc-1",
            "title": "Rust 服务端",
            "content": "接入 Redis 与 Elasticsearch"
        })
    ),
    responses(
        (status = 200, description = "索引成功（code=200000）", body = SearchWriteEnvelope),
        (status = "default", description = "业务异常（未登录或参数/ES 错误）：HTTP 状态码按错误码归属返回，响应体为统一错误信封", body = Exception),
    )
)]
pub fn toWrite_doc() {}

/// 全文检索
#[utoipa::path(
    get,
    path = "/api/v1/search/docs",
    tag = "Search",
    operation_id = "search.toRead",
    summary = "全文检索",
    description = "需要 JWT。按 q 在 title/content 上 multi_match 检索。",
    security(("bearer_auth" = [])),
    params(
        ("q" = String, Query, description = "搜索关键词", example = "Redis"),
        ("size" = Option<i64>, Query, description = "返回条数，默认 10，最大 100", example = 10),
    ),
    responses(
        (status = 200, description = "搜索成功（code=200000）", body = SearchEnvelope),
        (status = "default", description = "业务异常（未登录或参数/ES 错误）：HTTP 状态码按错误码归属返回，响应体为统一错误信封", body = Exception),
    )
)]
pub fn toRead_doc() {}
