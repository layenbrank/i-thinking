use std::sync::Arc;

use actix_web::{Responder, ResponseError, get, web};

use crate::clients::elasticsearch::EsClient;
use crate::clients::redis::RedisPool;
use crate::databases::database::Storage;
use crate::filters::exception::Exception;
use crate::interceptors::envelope::Envelope;
use crate::oas::common::Health;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(health_check);
}

/// 健康检查（含 Redis / Elasticsearch）
#[get("/api/health")]
async fn health_check(
    db: web::Data<Arc<Storage>>,
    redis: web::Data<Arc<RedisPool>>,
    es: web::Data<Arc<EsClient>>,
) -> impl Responder {
    let postgres = match db.raw().ping().await {
        Ok(()) => "up".to_string(),
        Err(_) => "down".to_string(),
    };
    let redis_status = match redis.ping().await {
        Ok(()) => "up".to_string(),
        Err(_) => "down".to_string(),
    };
    let elasticsearch = match es.cluster_health().await {
        Ok(status) => status,
        Err(_) => "down".to_string(),
    };

    let all_up = postgres == "up" && redis_status == "up" && elasticsearch != "down";
    let health = Health {
        status: if all_up {
            "healthy".into()
        } else {
            "degraded".into()
        },
        version: env!("CARGO_PKG_VERSION").into(),
        timestamp: chrono::Utc::now().timestamp_millis(),
        uptime: "N/A".into(),
        postgres,
        redis: redis_status,
        elasticsearch,
    };

    let msg = if all_up {
        "服务运行正常"
    } else {
        "服务部分依赖异常"
    };

    Envelope::success(health, msg)
        .transform()
        .unwrap_or_else(|_| Exception::internal_error("健康检查响应序列化失败").error_response())
}
