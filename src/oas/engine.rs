use super::common::{ErrorBody, SuggestionBody};
use crate::services::engine::schema::QueryP;

/// Bing 搜索建议代理
#[utoipa::path(
    get,
    path = "/api/v1/engine/suggestion",
    tag = "Engine",
    operation_id = "engine.toRead",
    summary = "获取搜索建议",
    description = "代理 Bing AS Suggestions API，无需鉴权。",
    params(
        ("pt" = String, Query, description = "页面类型", example = "page.home"),
        ("qry" = String, Query, description = "搜索关键词", example = "rust"),
        ("cp" = u64, Query, description = "光标位置", example = 4),
        ("csr" = String, Query, description = "CSR 参数", example = "1"),
        ("pths" = String, Query, description = "路径参数", example = "1"),
        ("cvid" = String, Query, description = "客户端 ID"),
    ),
    responses(
        (status = 200, description = "获取成功（code=200000）", body = SuggestionBody),
        (status = 200, description = "参数格式错误或上游失败", body = ErrorBody),
    )
)]
pub fn toRead_doc() {}

#[allow(dead_code)]
fn _query_p_ref() -> QueryP {
    QueryP::new(
        String::new(),
        String::new(),
        0,
        String::new(),
        String::new(),
        String::new(),
    )
}
