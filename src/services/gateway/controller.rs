use std::sync::Arc;

use actix_web::{HttpMessage, HttpRequest, HttpResponse, Result, web};
use uuid::Uuid;

use crate::clients::elasticsearch::EsClient;
use crate::clients::redis::RedisPool;
use crate::configures::configure::Configure;
use crate::databases::database::Storage;
use crate::filters::exception::Exception;
use crate::interceptors::envelope::{Envelope, Paginated};
use crate::services::gateway::client::Upstream;
use crate::services::gateway::schema::{
    AuditQueryP, ChatCompletionsP, ModelUpdateP, ModelWriteP, ProviderUpdateP, ProviderWriteP,
    UsageQueryP,
};
use crate::services::gateway::service::GatewayService;
use crate::utils::jwt::Claims;

pub struct GatewayController;

impl GatewayController {
    /// OpenAI 兼容 chat/completions 转发（stream 走 SSE 直传，非 stream 返回原始 JSON）。
    pub async fn chat(
        db: web::Data<Arc<Storage>>,
        redis: web::Data<Arc<RedisPool>>,
        config: web::Data<Arc<Configure>>,
        es: web::Data<Arc<EsClient>>,
        http: HttpRequest,
        body: web::Json<ChatCompletionsP>,
    ) -> Result<HttpResponse> {
        let (user_id, role) = identity(&http)?;
        let tenant_id = tenant_from_header(&http);
        let ip = client_ip(&http);
        let req = body.into_inner();
        let stream = req.stream.unwrap_or(false);
        let upstream = Upstream::new(config.as_ref());

        if stream {
            let stream = GatewayService::chat_stream(
                db.get_ref().clone(),
                redis.get_ref().clone(),
                config.get_ref().clone(),
                es.get_ref().clone(),
                &upstream,
                user_id,
                &role,
                tenant_id,
                &req,
                ip,
            )
            .await;
            match stream {
                Ok(s) => Ok(HttpResponse::Ok()
                    .content_type("text/event-stream")
                    .insert_header(("Cache-Control", "no-cache"))
                    .insert_header(("X-Accel-Buffering", "no"))
                    .streaming(s)),
                Err(e) => Exception::from(e).transform(),
            }
        } else {
            match GatewayService::chat_json(
                db.get_ref().clone(),
                redis.get_ref().clone(),
                config.get_ref().clone(),
                es.get_ref().clone(),
                &upstream,
                user_id,
                &role,
                tenant_id,
                &req,
                ip,
            )
            .await
            {
                Ok(value) => Ok(HttpResponse::Ok().json(value)),
                Err(e) => Exception::from(e).transform(),
            }
        }
    }

    pub async fn models(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
    ) -> Result<HttpResponse> {
        let (user_id, role) = identity(&http)?;
        let tenant_id = tenant_from_header(&http);
        match GatewayService::list_models(&db, user_id, &role, tenant_id).await {
            Ok(items) => Envelope::success(items, "获取模型列表成功").transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    // ---- 后台 provider CRUD ----

    pub async fn providers(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
    ) -> Result<HttpResponse> {
        let _ = identity(&http)?;
        match GatewayService::list_providers(&db).await {
            Ok(items) => Envelope::success(items, "获取供应商列表成功").transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    pub async fn provider_write(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        http: HttpRequest,
        req: web::Json<ProviderWriteP>,
    ) -> Result<HttpResponse> {
        let (user_id, _) = identity(&http)?;
        match GatewayService::create_provider(&db, &config, user_id, req.into_inner()).await {
            Ok(item) => Envelope::write(item).transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    pub async fn provider_update(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        http: HttpRequest,
        path: web::Path<String>,
        req: web::Json<ProviderUpdateP>,
    ) -> Result<HttpResponse> {
        let (user_id, _) = identity(&http)?;
        let id = parse_id(&path.into_inner())?;
        match GatewayService::update_provider(&db, &config, user_id, id, req.into_inner()).await {
            Ok(item) => Envelope::success(item, "更新供应商成功").transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    pub async fn provider_remove(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let _ = identity(&http)?;
        let id = parse_id(&path.into_inner())?;
        match GatewayService::delete_provider(&db, id).await {
            Ok(()) => Envelope::message_only("删除供应商成功").transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    // ---- 后台 model CRUD ----

    pub async fn models_admin(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
    ) -> Result<HttpResponse> {
        let _ = identity(&http)?;
        match GatewayService::list_models_admin(&db).await {
            Ok(items) => Envelope::success(items, "获取模型列表成功").transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    pub async fn model_write(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        req: web::Json<ModelWriteP>,
    ) -> Result<HttpResponse> {
        let (user_id, _) = identity(&http)?;
        match GatewayService::create_model(&db, user_id, req.into_inner()).await {
            Ok(item) => Envelope::write(item).transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    pub async fn model_update(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
        req: web::Json<ModelUpdateP>,
    ) -> Result<HttpResponse> {
        let (user_id, _) = identity(&http)?;
        let id = parse_id(&path.into_inner())?;
        match GatewayService::update_model(&db, user_id, id, req.into_inner()).await {
            Ok(item) => Envelope::success(item, "更新模型成功").transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    pub async fn model_remove(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let _ = identity(&http)?;
        let id = parse_id(&path.into_inner())?;
        match GatewayService::delete_model(&db, id).await {
            Ok(()) => Envelope::message_only("删除模型成功").transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    // ---- 用量 / 审计 ----

    pub async fn usage(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        query: web::Query<UsageQueryP>,
    ) -> Result<HttpResponse> {
        let _ = identity(&http)?;
        let page = query.page.unwrap_or(1).max(1);
        let size = query.size.unwrap_or(50).clamp(1, 200);
        match GatewayService::list_usage(&db, query.into_inner()).await {
            Ok((items, count)) => Envelope::success(
                Paginated::new(items, count, page, size),
                "获取用量成功",
            )
            .transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    pub async fn audit(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        query: web::Query<AuditQueryP>,
    ) -> Result<HttpResponse> {
        let _ = identity(&http)?;
        let tenant_id = query
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok());
        let page = query.page.unwrap_or(1).max(1);
        let size = query.size.unwrap_or(50).clamp(1, 200);
        match GatewayService::list_audit(&db, tenant_id, page, size).await {
            Ok((items, count)) => Envelope::success(
                Paginated::new(items, count, page, size),
                "获取审计日志成功",
            )
            .transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }
}

fn identity(http: &HttpRequest) -> Result<(Uuid, String), Exception> {
    let claims = http
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| Exception::unauthorized("用户未登录"))?;
    let user_id =
        Uuid::parse_str(&claims.sub).map_err(|_| Exception::unauthorized("用户未登录"))?;
    Ok((user_id, claims.role().as_str().to_string()))
}

fn tenant_from_header(http: &HttpRequest) -> Option<Uuid> {
    http.headers()
        .get("X-Tenant-ID")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
}

fn client_ip(http: &HttpRequest) -> Option<String> {
    http.peer_addr().map(|a| a.ip().to_string())
}

fn parse_id(value: &str) -> Result<Uuid, Exception> {
    Uuid::parse_str(value).map_err(|_| Exception::bad_request("ID 格式无效"))
}
