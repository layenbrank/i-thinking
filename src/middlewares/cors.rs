//! CORS 配置（Nest Middleware 角色）

use actix_cors::Cors;
use actix_web::http::header;

use crate::configures::configure::Configure;

/// 按 [`Configure::cors_origins`] 构建 CORS。
///
/// - 列表非空：仅允许列出的 Origin
/// - 列表为空且非生产：`allow_any_origin`（本地联调）
/// - 列表为空且生产：不放行任意 Origin（须配置 `CORS_ORIGINS`）
pub fn cors(config: &Configure) -> Cors {
    let methods = vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"];
    let base = Cors::default()
        .allowed_methods(methods)
        .allowed_headers(vec![header::AUTHORIZATION, header::ACCEPT])
        .allowed_header(header::CONTENT_TYPE)
        .max_age(3600);

    if !config.cors_origins.is_empty() {
        let mut cors = base;
        for origin in &config.cors_origins {
            cors = cors.allowed_origin(origin);
        }
        return cors;
    }

    if config.is_production() {
        tracing::warn!("CORS_ORIGINS empty in production; cross-origin browser calls will fail");
        base
    } else {
        base.allow_any_origin().send_wildcard()
    }
}
