use crate::oas::common::{Exception, HealthEnvelope};

/// 服务健康检查
#[utoipa::path(
    get,
    path = "/api/health",
    tag = "System",
    operation_id = "system.health",
    summary = "健康检查",
    description = "检查服务与 PostgreSQL / Redis / Elasticsearch 依赖状态，无需鉴权。依赖异常不改变 HTTP 状态码（200），通过 data.status=degraded 与各依赖项 up/down 表达。",
    responses(
        (status = 200, description = "服务正常（code=200000）", body = HealthEnvelope),
        (status = "default", description = "业务异常（服务异常）：HTTP 状态码按错误码归属返回，响应体为统一错误信封", body = Exception),
    )
)]
pub fn health_doc() {}
