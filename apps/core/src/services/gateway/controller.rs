//! 网关 HTTP 入口。
//!
//! 每个 handler 的第一件事是**进入作用域**：`X-Tenant-ID` 只是选择器（选了就进租户作用域，
//! 需是成员或平台管理员），没选就落在账号作用域；运维面（供应商/模型/用量/审计）则显式
//! 进入平台特权作用域。作用域在 handler 里显式收尾——只读回滚、写入提交——
//! 领域函数因此永远拿不到「裸连接」。

use std::sync::Arc;

use actix_web::{HttpRequest, HttpResponse, Result, web};
use entity::tenant;
use identity::{Principal, TenantId};
use sea_orm::{DatabaseTransaction, EntityTrait};
use uuid::Uuid;

use crate::clients::elasticsearch::EsClient;
use crate::clients::redis::RedisPool;
use crate::configures::configure::{Configure, SERVICE_TOKEN_MAX_TTL_SECS};
use crate::databases::database::Storage;
use crate::filters::exception::Exception;
use crate::guards::account::AccountScope;
use crate::guards::platform::PlatformScope;
use crate::guards::service::{InternalCaller, ServiceScope};
use crate::guards::session::Session;
use crate::guards::tenant::{TenantCtx, TenantScope};
use crate::interceptors::envelope::{Envelope, Paginated};
use crate::services::gateway::client::Upstream;
use crate::services::gateway::schema::{
    AuditQueryP, ChatCompletionsP, EmbeddingsP, ModelUpdateP, ModelWriteP, ProviderUpdateP,
    ProviderWriteP, SelfQuotaP, ServiceTokenP, ServiceTokenR, UsageQueryP,
};
use crate::services::gateway::service::{GatewayError, GatewayService};
use crate::services::gateway::service_token;
use crate::utils::code::{external, system};

pub struct GatewayController;

/// 本次请求作用域：选了租户就进租户作用域，否则账号作用域。
enum Scope {
    Tenant(TenantCtx),
    Account(AccountScope),
}

/// 作用域 + 请求身份：领域函数两者都要，于是打包成一个东西交给它们。
struct Target {
    scope: Scope,
    principal: Principal,
}

impl Target {
    /// 进入本次请求的作用域；`tenant_id` 来自 `X-Tenant-ID`，**它不是通行证**——
    /// 不是成员又不是平台管理员时 `TenantCtx::enter` 直接 403。
    async fn enter(
        db: &Storage,
        session: &Session,
        tenant_id: Option<Uuid>,
    ) -> Result<Self, Exception> {
        match tenant_id {
            Some(tid) => {
                let ctx = TenantCtx::enter(db, session, TenantId::from_uuid(tid)).await?;
                let principal = ctx.principal().clone();
                Ok(Self {
                    scope: Scope::Tenant(ctx),
                    principal,
                })
            }
            None => Ok(Self {
                scope: Scope::Account(AccountScope::enter(db, session).await?),
                principal: session.principal(),
            }),
        }
    }

    fn tx(&self) -> &DatabaseTransaction {
        match &self.scope {
            Scope::Tenant(ctx) => ctx.tx(),
            Scope::Account(scope) => scope.tx(),
        }
    }

    fn principal(&self) -> &Principal {
        &self.principal
    }

    /// 收尾：请求路径上的数据库工作都是只读（写另一段短作用域）或者已由服务层提交，
    /// 于是统一回滚，连接当场归还。
    async fn end(self) -> Result<(), Exception> {
        match self.scope {
            Scope::Tenant(ctx) => ctx.rollback().await,
            Scope::Account(scope) => scope.rollback().await.map_err(db_error),
        }
    }
}

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
        let session = session(&http)?;
        let ip = client_ip(&http);
        let req = body.into_inner();
        let stream = req.stream.unwrap_or(false);
        let upstream = Upstream::new(config.as_ref());

        // 解析在作用域里，上游调用与落库都在作用域之外：一次模型调用可能跑几十秒，
        // 事务绝不能跨越它（否则连接池会被长事务占满）。
        let target = Target::enter(&db, &session, tenant_from_header(&http)).await?;
        let prepared =
            GatewayService::prepare(target.tx(), target.principal(), &config, &redis, &req.model)
                .await;
        target.end().await?;
        let prepared = match prepared {
            Ok(prepared) => prepared,
            Err(err) => return Exception::from(err).transform(),
        };

        if stream {
            let stream = GatewayService::chat_stream(
                db.get_ref().clone(),
                redis.get_ref().clone(),
                config.get_ref().clone(),
                es.get_ref().clone(),
                &upstream,
                prepared,
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
                &db, &redis, &config, &es, &upstream, prepared, &req, ip,
            )
            .await
            {
                Ok(value) => Ok(HttpResponse::Ok().json(value)),
                Err(e) => Exception::from(e).transform(),
            }
        }
    }

    /// 服务身份出站：申请一枚短期令牌。
    ///
    /// 调用方是受信服务进程（当前只有 ai-worker），用它自己的共享令牌（`X-Internal-Token`）
    /// 换取一枚**带作用域**的短期令牌。响应是裸结构而不是信封：取令牌的是机器，
    /// 出错时才走信封（与 chat 的返回形状口径一致）。
    ///
    /// 这里只校验「租户存在」——模型是否存在、是否声明嵌入能力，由真正出站的那次调用
    /// （[`service_embeddings`](Self::service_embeddings)）判定，令牌段不做多余查库。
    pub async fn service_token(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        _caller: InternalCaller,
        body: web::Json<ServiceTokenP>,
    ) -> Result<HttpResponse> {
        let req = body.into_inner();
        let tenant_id = req
            .tenant_id
            .parse::<Uuid>()
            .map(TenantId::from_uuid)
            .map_err(|_| Exception::bad_request("租户ID格式无效"))?;
        let model = req.model.trim();
        if model.is_empty() {
            return Exception::bad_request("model 不能为空").transform();
        }

        let scope = TenantScope::open(&db, tenant_id).await.map_err(db_error)?;
        let known = tenant::Entity::find_by_id(tenant_id.as_uuid())
            .one(scope.tx())
            .await;
        scope.rollback().await.map_err(db_error)?;
        match known {
            Ok(Some(_)) => {}
            Ok(None) => return Exception::not_found("租户不存在").transform(),
            Err(err) => return db_error(err).transform(),
        }

        let secret = config.gateway_service_token_secret();
        if secret.is_empty() {
            return Exception::custom(system::SERVICE_UNAVAILABLE, "服务身份端点未启用")
                .transform();
        }

        let ttl = req
            .ttl_secs
            .unwrap_or_else(|| config.gateway_service_token_ttl_secs())
            .clamp(1, SERVICE_TOKEN_MAX_TTL_SECS);
        let (token, expires_at) =
            service_token::mint(secret, &tenant_id.as_uuid().to_string(), model, ttl).map_err(
                |err| {
                    tracing::error!(error = %err, "服务身份令牌签发失败");
                    Exception::internal_error("服务身份令牌签发失败")
                },
            )?;

        Ok(HttpResponse::Ok().json(ServiceTokenR {
            token,
            expires_at,
            tenant_id: tenant_id.as_uuid().to_string(),
            model: model.to_string(),
            token_type: "service".to_string(),
        }))
    }

    /// 服务身份出站：嵌入转发（模型由令牌作用域决定，不接受客户端指定）。
    pub async fn service_embeddings(
        db: web::Data<Arc<Storage>>,
        redis: web::Data<Arc<RedisPool>>,
        config: web::Data<Arc<Configure>>,
        es: web::Data<Arc<EsClient>>,
        http: HttpRequest,
        scope: ServiceScope,
        body: web::Json<EmbeddingsP>,
    ) -> Result<HttpResponse> {
        let req = body.into_inner();
        if let Some(requested) = req.model.as_deref().map(str::trim)
            && !requested.is_empty()
            && requested != scope.model()
        {
            return Exception::bad_request("model 与令牌作用域不一致").transform();
        }

        let ip = client_ip(&http);
        let upstream = Upstream::new(config.as_ref());

        // 与用户路径同一套时序：解析在作用域内，出站与记账在作用域外。
        let tenant = TenantScope::open(&db, scope.tenant_id())
            .await
            .map_err(db_error)?;
        let prepared = GatewayService::prepare_for_service(
            tenant.tx(),
            scope.tenant_id(),
            &config,
            &redis,
            scope.model(),
        )
        .await;
        tenant.rollback().await.map_err(db_error)?;
        let prepared = prepared.map_err(Exception::from)?;

        match GatewayService::embed_json(&db, &redis, &config, &es, &upstream, prepared, &req, ip)
            .await
        {
            Ok(value) => Ok(HttpResponse::Ok().json(value)),
            Err(e) => Exception::from(e).transform(),
        }
    }

    pub async fn models(db: web::Data<Arc<Storage>>, http: HttpRequest) -> Result<HttpResponse> {
        let session = session(&http)?;
        let target = Target::enter(&db, &session, tenant_from_header(&http)).await?;
        let result = GatewayService::list_models(target.tx(), target.principal()).await;
        target.end().await?;
        match result {
            Ok(items) => Envelope::success(items, "获取模型列表成功").transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    /// 只读自助配额：登录用户查自己（或自己所属租户）此刻的日窗用量与上限。
    pub async fn quota_me(
        db: web::Data<Arc<Storage>>,
        redis: web::Data<Arc<RedisPool>>,
        config: web::Data<Arc<Configure>>,
        http: HttpRequest,
        query: web::Query<SelfQuotaP>,
    ) -> Result<HttpResponse> {
        let session = session(&http)?;
        let target = Target::enter(&db, &session, tenant_from_header(&http)).await?;
        let result = GatewayService::self_quota(
            target.tx(),
            target.principal(),
            &config,
            &redis,
            query.model.as_deref(),
        )
        .await;
        target.end().await?;
        match result {
            Ok(data) => Envelope::success(data, "获取配额成功").transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    /// 档位目录：可开通档位与免费档基线（登录即可读，用于渲染档位卡）。
    pub async fn plans(
        config: web::Data<Arc<Configure>>,
        http: HttpRequest,
    ) -> Result<HttpResponse> {
        let _ = session(&http)?;
        let data = GatewayService::list_plans(&config);
        Envelope::success(data, "获取档位成功").transform()
    }

    // ---- 后台 provider CRUD ----

    pub async fn providers(db: web::Data<Arc<Storage>>, http: HttpRequest) -> Result<HttpResponse> {
        let _ = session(&http)?;
        let scope = PlatformScope::open(&db).await.map_err(db_error)?;
        let result = GatewayService::list_providers(&scope).await;
        platform_read(scope, result, |items| {
            Envelope::success(items, "获取供应商列表成功").transform()
        })
        .await
    }

    pub async fn provider_write(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        http: HttpRequest,
        req: web::Json<ProviderWriteP>,
    ) -> Result<HttpResponse> {
        let session = session(&http)?;
        let scope = PlatformScope::open(&db).await.map_err(db_error)?;
        let result = GatewayService::create_provider(
            &scope,
            &config,
            session.user_id().as_uuid(),
            req.into_inner(),
        )
        .await;
        platform_write(scope, result, |item| Envelope::write(item).transform()).await
    }

    pub async fn provider_update(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        http: HttpRequest,
        path: web::Path<String>,
        req: web::Json<ProviderUpdateP>,
    ) -> Result<HttpResponse> {
        let session = session(&http)?;
        let id = parse_id(&path.into_inner())?;
        let scope = PlatformScope::open(&db).await.map_err(db_error)?;
        let result = GatewayService::update_provider(
            &scope,
            &config,
            session.user_id().as_uuid(),
            id,
            req.into_inner(),
        )
        .await;
        platform_write(scope, result, |item| {
            Envelope::success(item, "更新供应商成功").transform()
        })
        .await
    }

    pub async fn provider_remove(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let _ = session(&http)?;
        let id = parse_id(&path.into_inner())?;
        let scope = PlatformScope::open(&db).await.map_err(db_error)?;
        let result = GatewayService::delete_provider(&scope, id).await;
        platform_write(scope, result, |()| {
            Envelope::message_only("删除供应商成功").transform()
        })
        .await
    }

    // ---- 后台 model CRUD ----

    pub async fn models_admin(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
    ) -> Result<HttpResponse> {
        let _ = session(&http)?;
        let scope = PlatformScope::open(&db).await.map_err(db_error)?;
        let result = GatewayService::list_models_admin(&scope).await;
        platform_read(scope, result, |items| {
            Envelope::success(items, "获取模型列表成功").transform()
        })
        .await
    }

    pub async fn model_write(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        req: web::Json<ModelWriteP>,
    ) -> Result<HttpResponse> {
        let session = session(&http)?;
        let scope = PlatformScope::open(&db).await.map_err(db_error)?;
        let result =
            GatewayService::create_model(&scope, session.user_id().as_uuid(), req.into_inner())
                .await;
        platform_write(scope, result, |item| Envelope::write(item).transform()).await
    }

    pub async fn model_update(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
        req: web::Json<ModelUpdateP>,
    ) -> Result<HttpResponse> {
        let session = session(&http)?;
        let id = parse_id(&path.into_inner())?;
        let scope = PlatformScope::open(&db).await.map_err(db_error)?;
        let result =
            GatewayService::update_model(&scope, session.user_id().as_uuid(), id, req.into_inner())
                .await;
        platform_write(scope, result, |item| {
            Envelope::success(item, "更新模型成功").transform()
        })
        .await
    }

    pub async fn model_remove(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let _ = session(&http)?;
        let id = parse_id(&path.into_inner())?;
        let scope = PlatformScope::open(&db).await.map_err(db_error)?;
        let result = GatewayService::delete_model(&scope, id).await;
        platform_write(scope, result, |()| {
            Envelope::message_only("删除模型成功").transform()
        })
        .await
    }

    // ---- 用量 / 审计 ----

    pub async fn usage(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        query: web::Query<UsageQueryP>,
    ) -> Result<HttpResponse> {
        let _ = session(&http)?;
        let page = query.page.unwrap_or(1).max(1);
        let size = query.size.unwrap_or(50).clamp(1, 200);
        let scope = PlatformScope::open(&db).await.map_err(db_error)?;
        let result = GatewayService::list_usage(&scope, query.into_inner())
            .await
            .map(|(items, count)| Paginated::new(items, count, page, size));
        platform_read(scope, result, |paginated| {
            Envelope::success(paginated, "获取用量成功").transform()
        })
        .await
    }

    pub async fn audit(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        query: web::Query<AuditQueryP>,
    ) -> Result<HttpResponse> {
        let _ = session(&http)?;
        let tenant_id = query
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok());
        let page = query.page.unwrap_or(1).max(1);
        let size = query.size.unwrap_or(50).clamp(1, 200);
        let scope = PlatformScope::open(&db).await.map_err(db_error)?;
        let result = GatewayService::list_audit(&scope, tenant_id, page, size)
            .await
            .map(|(items, count)| Paginated::new(items, count, page, size));
        platform_read(scope, result, |paginated| {
            Envelope::success(paginated, "获取审计日志成功").transform()
        })
        .await
    }
}

/// 只读处理：成功先归还事务再出响应；失败尽力回滚（回滚失败也不能盖掉原始错误）。
async fn platform_read<T, F>(
    scope: PlatformScope,
    result: std::result::Result<T, GatewayError>,
    ok: F,
) -> Result<HttpResponse>
where
    F: FnOnce(T) -> Result<HttpResponse>,
{
    match result {
        Ok(data) => {
            scope.rollback().await.map_err(db_error)?;
            ok(data)
        }
        Err(err) => {
            if let Err(e) = scope.rollback().await {
                tracing::warn!(error = %e, "平台作用域回滚失败");
            }
            Exception::from(err).transform()
        }
    }
}

/// 写入处理：**先提交再出响应**，提交失败绝不回 200（否则前端会以为写成功了）。
async fn platform_write<T, F>(
    scope: PlatformScope,
    result: std::result::Result<T, GatewayError>,
    ok: F,
) -> Result<HttpResponse>
where
    F: FnOnce(T) -> Result<HttpResponse>,
{
    match result {
        Ok(data) => {
            scope.commit().await.map_err(db_error)?;
            ok(data)
        }
        Err(err) => {
            if let Err(e) = scope.rollback().await {
                tracing::warn!(error = %e, "平台作用域回滚失败");
            }
            Exception::from(err).transform()
        }
    }
}

fn session(http: &HttpRequest) -> Result<Session, Exception> {
    Session::of(http).ok_or_else(|| Exception::unauthorized("用户未登录"))
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

fn db_error(err: sea_orm::DbErr) -> Exception {
    tracing::error!(error = %err, "gateway scope transaction failed");
    Exception::custom(external::DATABASE_ERROR, "数据库错误")
}
