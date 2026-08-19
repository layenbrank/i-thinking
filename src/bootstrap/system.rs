use crate::oas::common::Health;
use crate::utils::response::Body;
use actix_web::{HttpResponse, Responder, get, web};

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(health_check);
}

/// 健康检查
#[get("/api/health")]
async fn health_check() -> impl Responder {
    let health = Health {
        status: "healthy".into(),
        version: env!("CARGO_PKG_VERSION").into(),
        timestamp: chrono::Utc::now().timestamp_millis(),
        uptime: "N/A".into(),
    };

    Body::success(health, "服务运行正常")
        .transform()
        .unwrap_or_else(|_| HttpResponse::InternalServerError().json("Failed to generate response"))
}
