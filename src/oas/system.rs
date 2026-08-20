use crate::oas::common::{ErrorBody, HealthBody};

/// 服务健康检查
#[utoipa::path(
    get,
    path = "/api/health",
    tag = "System",
    operation_id = "system.health",
    summary = "健康检查",
    description = "检查服务与 PostgreSQL / Redis / Elasticsearch 依赖状态，无需鉴权。HTTP 状态码始终为 200。",
    responses(
        (status = 200, description = "服务正常（code=200000）", body = HealthBody),
        (status = 200, description = "服务异常", body = ErrorBody),
    )
)]
pub fn health_doc() {}
