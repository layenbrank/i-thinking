use std::sync::Arc;
use std::time::Instant;

use actix_web::web::Bytes;
use chrono::Utc;
use entity::{gateway_audit, gateway_model, gateway_provider, gateway_usage, tenant};
use futures::{Stream, StreamExt};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, Set,
};
use serde_json::{Value, json};
use uuid::Uuid;

use crate::clients::elasticsearch::EsClient;
use crate::clients::redis::RedisPool;
use crate::configures::configure::Configure;
use crate::databases::database::Storage;
use crate::filters::exception::Exception;
use crate::services::gateway::client::{Upstream, UpstreamError};
use crate::services::gateway::quota::{
    QuotaError, exhausted, quota_key, resets_at_millis, used_tokens,
};
use crate::services::gateway::repository::{UsageInput, record_audit, record_usage};
use crate::services::gateway::schema::{
    AuditR, ChatCompletionsP, ModelR, ModelUpdateP, ModelWriteP, PlanR, PlansR, ProviderR,
    ProviderUpdateP, ProviderWriteP, SelfQuotaR, UsageQueryP, UsageR,
};
use crate::services::subscription::service::{QuotaInfo, SubscriptionService};
use crate::services::tenant::schema::TenantRole;
use crate::services::tenant::service::{TenantError, TenantService};
use crate::utils::code::{auth as auth_codes, external, request, resource, system};
use crate::utils::db::is_unique_violation;
use crate::utils::encryption::{EncryptionError, decrypt_field, encrypt_field};

/// 目录里的「自动路由」伪模型名：由网关按可用性与能力替调用方挑一个真模型。
///
/// 它是**目录的一部分**（`/models` 会在有可用模型时把它排在首位），这样客户端不必
/// 把 `auto` 这个字符串写死在自己的代码里 —— 客户端只管发目录里读到的名字。
const AUTO_MODEL_NAME: &str = "auto";
const AUTO_MODEL_LABEL: &str = "自动选择";

#[derive(Debug, thiserror::Error)]
pub enum GatewayError {
    #[error("Model not found: {0}")]
    ModelNotFound(String),
    #[error("Provider not found")]
    ProviderNotFound,
    #[error("Model disabled")]
    ModelDisabled,
    #[error("Provider disabled")]
    ProviderDisabled,
    #[error("Model not allowed for role")]
    NotAllowed,
    #[error("Quota exceeded")]
    QuotaExceeded,
    #[error("Provider kind unsupported: {0}")]
    UnsupportedKind(String),
    #[error("Invalid parameter: {0}")]
    BadParam(String),
    #[error(transparent)]
    Upstream(#[from] UpstreamError),
    #[error(transparent)]
    Quota(#[from] QuotaError),
    #[error(transparent)]
    Encryption(#[from] EncryptionError),
    #[error(transparent)]
    Tenant(#[from] TenantError),
    #[error("Database error: {0}")]
    Db(String),
}

impl From<GatewayError> for Exception {
    fn from(err: GatewayError) -> Self {
        match err {
            GatewayError::ModelNotFound(_) => Exception::custom(resource::NOT_FOUND, "模型不存在"),
            GatewayError::ProviderNotFound => {
                Exception::custom(resource::NOT_FOUND, "供应商不存在")
            }
            GatewayError::ModelDisabled | GatewayError::ProviderDisabled => {
                Exception::custom(resource::ACCESS_RESTRICTED, "模型已停用")
            }
            GatewayError::NotAllowed => {
                Exception::custom(auth_codes::INSUFFICIENT_PERMISSIONS, "无权使用该模型")
            }
            GatewayError::QuotaExceeded => {
                Exception::custom(resource::QUOTA_EXCEEDED, "配额已用尽")
            }
            GatewayError::UnsupportedKind(kind) => Exception::custom(
                request::INVALID_PARAMETER_VALUE,
                format!("供应商暂不支持: {kind}"),
            ),
            GatewayError::BadParam(msg) => Exception::custom(request::INVALID_PARAMETER_VALUE, msg),
            GatewayError::Upstream(_) => {
                Exception::custom(external::THIRD_PARTY_API_ERROR, "模型服务暂不可用")
            }
            GatewayError::Quota(_) => Exception::custom(external::CACHE_ERROR, "缓存服务异常"),
            GatewayError::Encryption(_) => {
                Exception::custom(system::INTERNAL_ERROR, "密钥服务异常")
            }
            GatewayError::Tenant(e) => Exception::from(e),
            GatewayError::Db(msg) => {
                tracing::error!(error = %msg, "gateway database error");
                Exception::custom(external::DATABASE_ERROR, "数据库错误")
            }
        }
    }
}

enum QuotaScope {
    User(Uuid),
    Tenant(Uuid),
}

impl QuotaScope {
    fn as_str(&self) -> &'static str {
        match self {
            Self::User(_) => "USER",
            Self::Tenant(_) => "TENANT",
        }
    }

    fn id(&self) -> Uuid {
        match self {
            Self::User(id) | Self::Tenant(id) => *id,
        }
    }
}

/// 配额归属：有租户身份就记在租户上，否则记在用户上。
fn quota_scope(user_id: Uuid, tenant_id: Option<Uuid>) -> QuotaScope {
    match tenant_id {
        Some(tid) => QuotaScope::Tenant(tid),
        None => QuotaScope::User(user_id),
    }
}

struct Resolved {
    model: gateway_model::Model,
    provider: gateway_provider::Model,
    api_key: Option<String>,
    scope: QuotaScope,
    quota_limit: i64,
}

struct CompletionMeta {
    user_id: Uuid,
    tenant_id: Option<Uuid>,
    provider_id: Uuid,
    model_id: Uuid,
    model_name: String,
    quota_key: String,
}

pub struct GatewayService;

impl GatewayService {
    pub async fn chat_stream(
        db: Arc<Storage>,
        redis: Arc<RedisPool>,
        config: Arc<Configure>,
        es: Arc<EsClient>,
        upstream: &Upstream,
        user_id: Uuid,
        platform_role: &str,
        tenant_id: Option<Uuid>,
        req: &ChatCompletionsP,
        ip: Option<String>,
    ) -> Result<impl Stream<Item = Result<Bytes, actix_web::Error>> + 'static, GatewayError> {
        let resolved = resolve(
            &db,
            &config,
            &redis,
            user_id,
            platform_role,
            tenant_id,
            &req.model,
        )
        .await?;

        let key = quota_key_for(&resolved.scope);
        if exhausted(&redis, &key, resolved.quota_limit).await? {
            return Err(GatewayError::QuotaExceeded);
        }

        let body = build_body(req, &resolved.model.name, true);
        let url = chat_url(&resolved.provider)?;
        let resp = upstream
            .post_chat(&url, resolved.api_key.as_deref(), &body)
            .await?;

        let meta = CompletionMeta {
            user_id,
            tenant_id,
            provider_id: resolved.provider.id,
            model_id: resolved.model.id,
            model_name: resolved.model.name.clone(),
            quota_key: key,
        };
        let record = Record {
            meta,
            db: Arc::clone(&db),
            redis: Arc::clone(&redis),
            config: Arc::clone(&config),
            es: Arc::clone(&es),
            ip,
            started: Instant::now(),
            buffer: String::new(),
            usage: None,
            failed: false,
        };

        Ok(sse_stream(resp, record))
    }

    pub async fn chat_json(
        db: Arc<Storage>,
        redis: Arc<RedisPool>,
        config: Arc<Configure>,
        es: Arc<EsClient>,
        upstream: &Upstream,
        user_id: Uuid,
        platform_role: &str,
        tenant_id: Option<Uuid>,
        req: &ChatCompletionsP,
        ip: Option<String>,
    ) -> Result<Value, GatewayError> {
        let resolved = resolve(
            &db,
            &config,
            &redis,
            user_id,
            platform_role,
            tenant_id,
            &req.model,
        )
        .await?;

        let key = quota_key_for(&resolved.scope);
        if exhausted(&redis, &key, resolved.quota_limit).await? {
            return Err(GatewayError::QuotaExceeded);
        }

        let body = build_body(req, &resolved.model.name, false);
        let url = chat_url(&resolved.provider)?;
        let started = Instant::now();
        let resp = upstream
            .post_chat(&url, resolved.api_key.as_deref(), &body)
            .await?;
        let text = resp.text().await.map_err(UpstreamError::Http)?;
        let latency = started.elapsed().as_millis() as i64;

        let value: Value = serde_json::from_str(&text).unwrap_or_else(|_| json!({ "raw": text }));
        let usage = value.get("usage").map(parse_usage_json);

        record_completion(
            &db,
            &redis,
            &config,
            &es,
            &CompletionMeta {
                user_id,
                tenant_id,
                provider_id: resolved.provider.id,
                model_id: resolved.model.id,
                model_name: resolved.model.name.clone(),
                quota_key: key,
            },
            usage,
            "OK",
            latency,
            ip,
        )
        .await;

        Ok(value)
    }

    /// 用户可见模型列表（平台 + 租户，按 enabled + allow_roles 过滤）。
    ///
    /// 有可见模型时会在首位插入 `auto`（自动路由）伪条目 —— 目录即契约，
    /// 客户端点它就能让网关代挑模型。
    pub async fn list_models(
        db: &Storage,
        user_id: Uuid,
        platform_role: &str,
        tenant_id: Option<Uuid>,
    ) -> Result<Vec<ModelR>, GatewayError> {
        let tenant_role = match tenant_id {
            Some(tid) => TenantService::membership_role(db, user_id, tid).await?,
            None => None,
        };

        let platform = gateway_model::Entity::find()
            .filter(gateway_model::Column::TenantId.is_null())
            .filter(gateway_model::Column::Enabled.eq(true))
            .all(&db.db)
            .await
            .map_err(db_err)?;

        let mut models = platform;
        if let Some(tid) = tenant_id {
            let scoped = gateway_model::Entity::find()
                .filter(gateway_model::Column::TenantId.eq(Some(tid)))
                .filter(gateway_model::Column::Enabled.eq(true))
                .all(&db.db)
                .await
                .map_err(db_err)?;
            models.extend(scoped);
        }

        let names = provider_names(db).await?;
        let mut out: Vec<ModelR> = models
            .into_iter()
            .filter(|m| role_allowed(m, platform_role, tenant_role))
            .map(|m| {
                let provider_name = names.get(&m.provider_id).cloned();
                model_to_r(m, provider_name)
            })
            .collect();

        if !out.is_empty() {
            out.insert(0, auto_model_r());
        }
        Ok(out)
    }

    /// 只读自助配额：当前身份此刻的日窗用量与上限。
    ///
    /// 上限与归属与聊天热路径共用（`quota_scope` / `resolve_quota`），否则界面上的剩余量
    /// 与真正拦截请求的数字会对不上。唯一区别是这里会校验租户成员身份：目录与聊天都直接
    /// 信任 `X-Tenant-ID`，只读接口没理由把别人租户的档位与用量透出去。
    pub async fn self_quota(
        db: &Storage,
        config: &Configure,
        redis: &RedisPool,
        user_id: Uuid,
        tenant_id: Option<Uuid>,
        model_name: Option<&str>,
    ) -> Result<SelfQuotaR, GatewayError> {
        let tenant_id = match tenant_id {
            Some(tid) => TenantService::membership_role(db, user_id, tid)
                .await?
                .map(|_| tid),
            None => None,
        };
        let scope = quota_scope(user_id, tenant_id);
        let key = quota_key_for(&scope);
        let model = match model_name {
            // `auto` 要等网关挑完才知道是哪条模型，这里按身份级配额回答
            Some(name) if !name.eq_ignore_ascii_case(AUTO_MODEL_NAME) => {
                match find_model(db, name, tenant_id).await {
                    Ok(model) => Some(model),
                    Err(GatewayError::ModelNotFound(_)) => None,
                    Err(err) => return Err(err),
                }
            }
            _ => None,
        };
        let (limit, info) = resolve_quota(db, config, redis, tenant_id, model.as_ref()).await?;
        let used = used_tokens(redis, &key).await?;
        let (source, plan) = match info {
            Some(info) => (info.source.as_str().to_string(), info.plan),
            None => ("MODEL".to_string(), None),
        };
        let tenant_type = match tenant_id {
            Some(tid) => tenant::Entity::find_by_id(tid)
                .one(&db.db)
                .await
                .map_err(db_err)?
                .map(|row| row.tenant_type),
            None => None,
        };

        Ok(SelfQuotaR {
            scope: scope.as_str().to_string(),
            scope_id: scope.id().to_string(),
            tenant_id: tenant_id.map(|tid| tid.to_string()),
            tenant_type,
            source,
            plan,
            limit,
            used,
            remaining: (limit - used).max(0),
            exhausted: used >= limit,
            resets_at: resets_at_millis(),
        })
    }

    /// 档位目录：可开通档位（按配额从低到高）+ 免费档基线。
    ///
    /// 档位只有「名字 + 日配额」两个事实，都出自 `gateway.plan_daily_token_quota`（不落库），
    /// 客户端据此渲染档位卡，而不是让用户手填档位名。
    pub fn list_plans(config: &Configure) -> PlansR {
        let mut plans: Vec<PlanR> = config
            .gateway_plan_daily_token_quota_table()
            .iter()
            .filter(|(_, quota)| **quota > 0)
            .map(|(plan, quota)| PlanR {
                plan: plan.clone(),
                daily_token_quota: *quota,
            })
            .collect();
        plans.sort_by(|a, b| {
            a.daily_token_quota
                .cmp(&b.daily_token_quota)
                .then_with(|| a.plan.cmp(&b.plan))
        });
        PlansR {
            plans,
            free_daily_token_quota: config.gateway_free_daily_token_quota(),
        }
    }

    // ---- 后台 provider CRUD（平台级：tenant_id IS NULL）----

    pub async fn list_providers(db: &Storage) -> Result<Vec<ProviderR>, GatewayError> {
        let providers = gateway_provider::Entity::find()
            .filter(gateway_provider::Column::TenantId.is_null())
            .all(&db.db)
            .await
            .map_err(db_err)?;
        Ok(providers.into_iter().map(provider_to_r).collect())
    }

    pub async fn create_provider(
        db: &Storage,
        config: &Configure,
        actor: Uuid,
        req: ProviderWriteP,
    ) -> Result<ProviderR, GatewayError> {
        validate_kind(&req.kind)?;
        if req.base_url.trim().is_empty() || req.name.trim().is_empty() {
            return Err(GatewayError::BadParam(
                "name 与 baseUrl 不能为空".to_string(),
            ));
        }
        let api_key_enc = encrypt_api_key(config, req.api_key.as_deref())?;
        let now = Utc::now().fixed_offset();
        let model = gateway_provider::ActiveModel {
            id: Set(Uuid::new_v4()),
            tenant_id: Set(None),
            kind: Set(req.kind),
            name: Set(req.name.trim().to_string()),
            base_url: Set(req.base_url.trim().to_string()),
            api_key_enc: Set(api_key_enc),
            status: Set(parse_status(req.status.as_deref())?),
            archived_at: Set(None),
            created_at: Set(now),
            creator: Set(Some(actor)),
            updated_at: Set(now),
            updater: Set(Some(actor)),
            expires_at: Set(None),
        }
        .insert(&db.db)
        .await
        .map_err(db_err)?;
        Ok(provider_to_r(model))
    }

    pub async fn update_provider(
        db: &Storage,
        config: &Configure,
        actor: Uuid,
        id: Uuid,
        req: ProviderUpdateP,
    ) -> Result<ProviderR, GatewayError> {
        let model = gateway_provider::Entity::find_by_id(id)
            .one(&db.db)
            .await
            .map_err(db_err)?
            .ok_or(GatewayError::ProviderNotFound)?;

        let mut active: gateway_provider::ActiveModel = model.into();
        if let Some(kind) = req.kind {
            validate_kind(&kind)?;
            active.kind = Set(kind);
        }
        if let Some(name) = req.name {
            if name.trim().is_empty() {
                return Err(GatewayError::BadParam("name 不能为空".to_string()));
            }
            active.name = Set(name.trim().to_string());
        }
        if let Some(base_url) = req.base_url {
            if base_url.trim().is_empty() {
                return Err(GatewayError::BadParam("baseUrl 不能为空".to_string()));
            }
            active.base_url = Set(base_url.trim().to_string());
        }
        if let Some(key) = req.api_key {
            active.api_key_enc = Set(encrypt_api_key(config, Some(&key))?);
        }
        if let Some(status) = req.status {
            active.status = Set(parse_status(Some(&status))?);
        }
        active.updated_at = Set(Utc::now().fixed_offset());
        active.updater = Set(Some(actor));

        let updated = active.update(&db.db).await.map_err(db_err)?;
        Ok(provider_to_r(updated))
    }

    pub async fn delete_provider(db: &Storage, id: Uuid) -> Result<(), GatewayError> {
        gateway_provider::Entity::delete_by_id(id)
            .exec(&db.db)
            .await
            .map_err(db_err)?;
        Ok(())
    }

    // ---- 后台 model CRUD（平台级）----

    pub async fn list_models_admin(db: &Storage) -> Result<Vec<ModelR>, GatewayError> {
        let models = gateway_model::Entity::find()
            .filter(gateway_model::Column::TenantId.is_null())
            .all(&db.db)
            .await
            .map_err(db_err)?;
        let names = provider_names(db).await?;
        Ok(models
            .into_iter()
            .map(|m| {
                let provider_name = names.get(&m.provider_id).cloned();
                model_to_r(m, provider_name)
            })
            .collect())
    }

    pub async fn create_model(
        db: &Storage,
        actor: Uuid,
        req: ModelWriteP,
    ) -> Result<ModelR, GatewayError> {
        let provider_id = parse_uuid(&req.provider_id)
            .map_err(|_| GatewayError::BadParam("providerId 无效".to_string()))?;
        if req.name.trim().is_empty() {
            return Err(GatewayError::BadParam("name 不能为空".to_string()));
        }
        if req.name.trim().eq_ignore_ascii_case(AUTO_MODEL_NAME) {
            return Err(GatewayError::BadParam(
                "auto 为网关保留的自动路由模型名".to_string(),
            ));
        }
        let now = Utc::now().fixed_offset();
        let model = gateway_model::ActiveModel {
            id: Set(Uuid::new_v4()),
            provider_id: Set(provider_id),
            tenant_id: Set(None),
            name: Set(req.name.trim().to_string()),
            label: Set(req.label),
            allow_roles: Set(roles_to_json(req.allow_roles)),
            enabled: Set(req.enabled.unwrap_or(true)),
            daily_token_quota: Set(req.daily_token_quota.unwrap_or(0)),
            capabilities: Set(normalize_capabilities(req.capabilities)?),
            context_window: Set(normalize_context_window(req.context_window)),
            archived_at: Set(None),
            created_at: Set(now),
            creator: Set(Some(actor)),
            updated_at: Set(now),
            updater: Set(Some(actor)),
            expires_at: Set(None),
        }
        .insert(&db.db)
        .await
        .map_err(|e| {
            if is_unique_violation(&e) {
                GatewayError::BadParam("模型已存在".to_string())
            } else {
                db_err(e)
            }
        })?;
        let provider_name = find_provider_name(db, model.provider_id).await;
        Ok(model_to_r(model, provider_name))
    }

    pub async fn update_model(
        db: &Storage,
        actor: Uuid,
        id: Uuid,
        req: ModelUpdateP,
    ) -> Result<ModelR, GatewayError> {
        let model = gateway_model::Entity::find_by_id(id)
            .one(&db.db)
            .await
            .map_err(db_err)?
            .ok_or(GatewayError::ModelNotFound(id.to_string()))?;

        let mut active: gateway_model::ActiveModel = model.into();
        if let Some(name) = req.name {
            if name.trim().is_empty() {
                return Err(GatewayError::BadParam("name 不能为空".to_string()));
            }
            active.name = Set(name.trim().to_string());
        }
        if let Some(label) = req.label {
            active.label = Set(label);
        }
        if req.allow_roles.is_some() {
            active.allow_roles = Set(roles_to_json(req.allow_roles));
        }
        if let Some(enabled) = req.enabled {
            active.enabled = Set(enabled);
        }
        if let Some(quota) = req.daily_token_quota {
            active.daily_token_quota = Set(quota);
        }
        if req.capabilities.is_some() {
            active.capabilities = Set(normalize_capabilities(req.capabilities)?);
        }
        if let Some(window) = req.context_window {
            active.context_window = Set(normalize_context_window(Some(window)));
        }
        active.updated_at = Set(Utc::now().fixed_offset());
        active.updater = Set(Some(actor));

        let updated = active.update(&db.db).await.map_err(db_err)?;
        let provider_name = find_provider_name(db, updated.provider_id).await;
        Ok(model_to_r(updated, provider_name))
    }

    pub async fn delete_model(db: &Storage, id: Uuid) -> Result<(), GatewayError> {
        gateway_model::Entity::delete_by_id(id)
            .exec(&db.db)
            .await
            .map_err(db_err)?;
        Ok(())
    }

    // ---- 用量 / 审计查询 ----

    pub async fn list_usage(
        db: &Storage,
        req: UsageQueryP,
    ) -> Result<(Vec<UsageR>, u64), GatewayError> {
        let size = req.size.unwrap_or(50).clamp(1, 200);
        let page = req.page.unwrap_or(1).max(1);

        let mut query = gateway_usage::Entity::find();
        if let Some(tid) = req.tenant_id.as_deref() {
            if let Ok(id) = Uuid::parse_str(tid) {
                query = query.filter(gateway_usage::Column::TenantId.eq(Some(id)));
            }
        }
        if let Some(mid) = req.model_id.as_deref() {
            if let Ok(id) = Uuid::parse_str(mid) {
                query = query.filter(gateway_usage::Column::ModelId.eq(id));
            }
        }
        if let Some(from) = req.from {
            query = query.filter(
                gateway_usage::Column::CreatedAt.gte(
                    chrono::DateTime::<chrono::Utc>::from_timestamp_millis(from)
                        .map(|t| t.fixed_offset())
                        .unwrap_or(Utc::now().fixed_offset()),
                ),
            );
        }
        if let Some(to) = req.to {
            query = query.filter(
                gateway_usage::Column::CreatedAt.lte(
                    chrono::DateTime::<chrono::Utc>::from_timestamp_millis(to)
                        .map(|t| t.fixed_offset())
                        .unwrap_or(Utc::now().fixed_offset()),
                ),
            );
        }

        let count = query.clone().count(&db.db).await.map_err(db_err)?;
        // 对外 page 从 1 起（与 Paginated::new 的 next/prev 语义一致），sea-orm 从 0 起
        let items = query
            .order_by_desc(gateway_usage::Column::CreatedAt)
            .paginate(&db.db, size as u64)
            .fetch_page((page as u64).saturating_sub(1))
            .await
            .map_err(db_err)?;

        Ok((items.into_iter().map(usage_to_r).collect(), count))
    }

    pub async fn list_audit(
        db: &Storage,
        tenant_id: Option<Uuid>,
        page: u32,
        size: u32,
    ) -> Result<(Vec<AuditR>, u64), GatewayError> {
        let size = size.clamp(1, 200);
        let page = page.max(1);
        let mut query = gateway_audit::Entity::find();
        if let Some(tid) = tenant_id {
            query = query.filter(gateway_audit::Column::TenantId.eq(Some(tid)));
        }
        let count = query.clone().count(&db.db).await.map_err(db_err)?;
        let items = query
            .order_by_desc(gateway_audit::Column::CreatedAt)
            .paginate(&db.db, size as u64)
            .fetch_page((page as u64).saturating_sub(1))
            .await
            .map_err(db_err)?;
        Ok((items.into_iter().map(audit_to_r).collect(), count))
    }
}

// ---- 解析 ----

async fn resolve(
    db: &Storage,
    config: &Configure,
    redis: &RedisPool,
    user_id: Uuid,
    platform_role: &str,
    tenant_id: Option<Uuid>,
    model_name: &str,
) -> Result<Resolved, GatewayError> {
    let tenant_role = match tenant_id {
        Some(tid) => TenantService::membership_role(db, user_id, tid).await?,
        None => None,
    };

    let model = if model_name.eq_ignore_ascii_case(AUTO_MODEL_NAME) {
        pick_auto_model(db, platform_role, tenant_role, tenant_id).await?
    } else {
        find_model(db, model_name, tenant_id).await?
    };
    if !model.enabled {
        return Err(GatewayError::ModelDisabled);
    }

    if !role_allowed(&model, platform_role, tenant_role) {
        return Err(GatewayError::NotAllowed);
    }

    let provider = gateway_provider::Entity::find_by_id(model.provider_id)
        .one(&db.db)
        .await
        .map_err(db_err)?
        .ok_or(GatewayError::ProviderNotFound)?;
    if provider.status != "ACTIVE" {
        return Err(GatewayError::ProviderDisabled);
    }

    let api_key = if provider.api_key_enc.is_empty() {
        None
    } else {
        let aes_key = config.aes_key().ok_or(EncryptionError::InvalidKeyLength)?;
        Some(decrypt_field(&provider.api_key_enc, aes_key)?)
    };

    // 配额优先级：模型覆盖 > 租户级（订阅档位 > 免费档 / 全局兜底）
    let (quota_limit, _) = resolve_quota(db, config, redis, tenant_id, Some(&model)).await?;
    let scope = quota_scope(user_id, tenant_id);

    Ok(Resolved {
        model,
        provider,
        api_key,
        scope,
        quota_limit,
    })
}

/// 日配额上限及其身份级来源：模型覆盖 > 租户/用户级（订阅档位 > 免费档 > 全局兜底）。
///
/// 命中模型覆盖时**不查**身份级配额，返回 `None` —— 聊天热路径不必为此多打一次 Redis。
/// 聊天拦截与只读自助查询共用它，保证「界面显示的剩余」与「服务端拦截的数字」同源。
async fn resolve_quota(
    db: &Storage,
    config: &Configure,
    redis: &RedisPool,
    tenant_id: Option<Uuid>,
    model: Option<&gateway_model::Model>,
) -> Result<(i64, Option<QuotaInfo>), GatewayError> {
    if let Some(quota) = model.map(|m| m.daily_token_quota).filter(|q| *q > 0) {
        return Ok((quota, None));
    }
    let info = SubscriptionService::effective_quota(db, config, redis, tenant_id)
        .await
        .map_err(db_err)?;
    Ok((info.limit, Some(info)))
}

async fn find_model(
    db: &Storage,
    name: &str,
    tenant_id: Option<Uuid>,
) -> Result<gateway_model::Model, GatewayError> {
    if let Some(tid) = tenant_id {
        let scoped = gateway_model::Entity::find()
            .filter(gateway_model::Column::Name.eq(name))
            .filter(gateway_model::Column::TenantId.eq(Some(tid)))
            .one(&db.db)
            .await
            .map_err(db_err)?;
        if let Some(m) = scoped {
            return Ok(m);
        }
    }

    gateway_model::Entity::find()
        .filter(gateway_model::Column::Name.eq(name))
        .filter(gateway_model::Column::TenantId.is_null())
        .one(&db.db)
        .await
        .map_err(db_err)?
        .ok_or(GatewayError::ModelNotFound(name.to_string()))
}

/// 自动路由：在当前身份可见的模型里挑一个。
///
/// 排序偏好（越靠前越优先）：平台模型 → 支持工具的模型 → 创建早的（稳定优先）。
/// 不做语义路由（不猜「这条消息该用谁」），只保证「目录里有 auto 就一定挑得出模型」。
async fn pick_auto_model(
    db: &Storage,
    platform_role: &str,
    tenant_role: Option<TenantRole>,
    tenant_id: Option<Uuid>,
) -> Result<gateway_model::Model, GatewayError> {
    let mut models = gateway_model::Entity::find()
        .filter(gateway_model::Column::Enabled.eq(true))
        .filter(gateway_model::Column::TenantId.is_null())
        .all(&db.db)
        .await
        .map_err(db_err)?;

    if let Some(tid) = tenant_id {
        let scoped = gateway_model::Entity::find()
            .filter(gateway_model::Column::Enabled.eq(true))
            .filter(gateway_model::Column::TenantId.eq(Some(tid)))
            .all(&db.db)
            .await
            .map_err(db_err)?;
        models.extend(scoped);
    }

    models.retain(|m| role_allowed(m, platform_role, tenant_role));
    models.sort_by_key(|m| {
        (
            m.tenant_id.is_some(),
            !supports_tools(m),
            m.created_at,
            m.name.clone(),
        )
    });
    models
        .into_iter()
        .next()
        .ok_or_else(|| GatewayError::ModelNotFound(AUTO_MODEL_NAME.to_string()))
}

/// 模型是否声明了工具调用能力；**未声明视为支持**（与客户端 opt-out 口径一致）。
fn supports_tools(model: &gateway_model::Model) -> bool {
    model
        .capabilities
        .as_ref()
        .and_then(|c| c.get("tools"))
        .and_then(|v| v.as_bool())
        .unwrap_or(true)
}

/// 收敛能力声明：`None` / `null` / 空对象 → 未声明；只保留 `tools/reasoning/vision` 的布尔值。
fn normalize_capabilities(raw: Option<Value>) -> Result<Option<Value>, GatewayError> {
    let Some(raw) = raw else {
        return Ok(None);
    };
    if raw.is_null() {
        return Ok(None);
    }
    let obj = raw
        .as_object()
        .ok_or_else(|| GatewayError::BadParam("capabilities 必须是对象".to_string()))?;

    let mut out = serde_json::Map::new();
    for key in ["tools", "reasoning", "vision"] {
        if let Some(value) = obj.get(key) {
            let flag = value.as_bool().ok_or_else(|| {
                GatewayError::BadParam(format!("capabilities.{key} 必须是布尔值"))
            })?;
            out.insert(key.to_string(), Value::Bool(flag));
        }
    }
    if out.is_empty() {
        return Ok(None);
    }
    Ok(Some(Value::Object(out)))
}

/// 上下文窗口：非正数视为「未知」（清空）。
fn normalize_context_window(raw: Option<i64>) -> Option<i64> {
    raw.filter(|v| *v > 0)
}

/// 一次性取 `providerID → 展示名`，避免逐条模型查库。
async fn provider_names(
    db: &Storage,
) -> Result<std::collections::HashMap<Uuid, String>, GatewayError> {
    let providers = gateway_provider::Entity::find()
        .all(&db.db)
        .await
        .map_err(db_err)?;
    Ok(providers.into_iter().map(|p| (p.id, p.name)).collect())
}

async fn find_provider_name(db: &Storage, provider_id: Uuid) -> Option<String> {
    gateway_provider::Entity::find_by_id(provider_id)
        .one(&db.db)
        .await
        .ok()
        .flatten()
        .map(|p| p.name)
}

/// 目录里的自动路由伪条目：没有 id / provider（它不对应任何一行模型）。
fn auto_model_r() -> ModelR {
    ModelR {
        id: String::new(),
        provider_id: String::new(),
        name: AUTO_MODEL_NAME.to_string(),
        label: AUTO_MODEL_LABEL.to_string(),
        allow_roles: None,
        enabled: true,
        daily_token_quota: 0,
        capabilities: Some(json!({ "tools": true, "reasoning": false, "vision": false })),
        context_window: None,
        provider_name: None,
        created_at: 0,
        updated_at: 0,
    }
}

fn role_allowed(
    model: &gateway_model::Model,
    platform_role: &str,
    tenant_role: Option<TenantRole>,
) -> bool {
    let Some(json) = model.allow_roles.as_ref() else {
        return true;
    };
    let Some(arr) = json.as_array() else {
        return true;
    };
    if arr.is_empty() {
        return true;
    }
    let roles: Vec<&str> = arr.iter().filter_map(|v| v.as_str()).collect();
    roles.contains(&platform_role) || tenant_role.is_some_and(|t| roles.contains(&t.as_str()))
}

fn chat_url(provider: &gateway_provider::Model) -> Result<String, GatewayError> {
    let kind = provider.kind.as_str();
    if !matches!(kind, "openai" | "deepseek" | "qwen" | "zhipu" | "ollama") {
        return Err(GatewayError::UnsupportedKind(provider.kind.clone()));
    }
    Ok(format!(
        "{}/chat/completions",
        provider.base_url.trim_end_matches('/')
    ))
}

fn build_body(req: &ChatCompletionsP, model_name: &str, stream: bool) -> Value {
    let mut map = req.extra.clone();
    map.insert("model".to_string(), json!(model_name));
    map.insert("stream".to_string(), json!(stream));
    if stream {
        map.insert(
            "stream_options".to_string(),
            json!({ "include_usage": true }),
        );
    }
    Value::Object(map)
}

fn quota_key_for(scope: &QuotaScope) -> String {
    match scope {
        QuotaScope::User(id) => quota_key("user", id),
        QuotaScope::Tenant(id) => quota_key("tenant", id),
    }
}

// ---- 用量/审计落库 ----

#[allow(clippy::too_many_arguments)]
async fn record_completion(
    db: &Storage,
    redis: &RedisPool,
    config: &Configure,
    es: &EsClient,
    meta: &CompletionMeta,
    usage: Option<(i64, i64, i64)>,
    status: &str,
    latency_ms: i64,
    ip: Option<String>,
) {
    let (prompt, completion, total) = usage.unwrap_or((0, 0, 0));
    let input = UsageInput {
        tenant_id: meta.tenant_id,
        user_id: meta.user_id,
        provider_id: meta.provider_id,
        model_id: meta.model_id,
        prompt_tokens: prompt,
        completion_tokens: completion,
        total_tokens: total,
        status: status.to_string(),
        latency_ms,
    };

    let _ = record_usage(db, &input).await;
    let _ = crate::services::gateway::quota::add_tokens(redis, &meta.quota_key, total).await;
    let _ = crate::services::gateway::repository::index_usage(
        es,
        config.gateway_usage_es_index(),
        &input,
    )
    .await;
    if config.gateway_audit_enabled() {
        let _ = record_audit(
            db,
            meta.tenant_id,
            meta.user_id,
            "gateway.chat",
            &meta.model_name,
            Some(json!({ "status": status, "totalTokens": total })),
            ip,
        )
        .await;
    }
}

struct Record {
    meta: CompletionMeta,
    db: Arc<Storage>,
    redis: Arc<RedisPool>,
    config: Arc<Configure>,
    es: Arc<EsClient>,
    ip: Option<String>,
    started: Instant,
    buffer: String,
    usage: Option<(i64, i64, i64)>,
    failed: bool,
}

impl Record {
    fn capture(&mut self, chunk: &[u8]) {
        self.buffer.push_str(&String::from_utf8_lossy(chunk));
        while let Some(pos) = self.buffer.find('\n') {
            let line = self.buffer[..pos].to_string();
            self.buffer.drain(..=pos);
            let line = line.trim();
            let Some(payload) = line.strip_prefix("data:") else {
                continue;
            };
            let payload = payload.trim();
            if payload.is_empty() || payload == "[DONE]" {
                continue;
            }
            if let Ok(v) = serde_json::from_str::<Value>(payload) {
                if let Some(u) = v.get("usage") {
                    self.usage = Some(parse_usage_json(u));
                }
            }
        }
    }

    async fn finish(&mut self) {
        let latency = self.started.elapsed().as_millis() as i64;
        let status = if self.failed { "UPSTREAM" } else { "OK" };
        record_completion(
            &self.db,
            &self.redis,
            &self.config,
            &self.es,
            &self.meta,
            self.usage,
            status,
            latency,
            self.ip.clone(),
        )
        .await;
    }
}

fn sse_stream(
    resp: reqwest::Response,
    mut record: Record,
) -> impl Stream<Item = Result<Bytes, actix_web::Error>> + 'static {
    let mut upstream = resp.bytes_stream();
    futures::stream::unfold(
        (upstream, record),
        |(mut upstream, mut record)| async move {
            match upstream.next().await {
                Some(Ok(chunk)) => {
                    record.capture(&chunk);
                    Some((Ok(chunk), (upstream, record)))
                }
                Some(Err(e)) => {
                    record.failed = true;
                    record.finish().await;
                    Some((
                        Err(actix_web::error::ErrorInternalServerError(e)),
                        (upstream, record),
                    ))
                }
                None => {
                    record.finish().await;
                    None
                }
            }
        },
    )
}

fn parse_usage_json(u: &Value) -> (i64, i64, i64) {
    (
        u.get("prompt_tokens").and_then(|x| x.as_i64()).unwrap_or(0),
        u.get("completion_tokens")
            .and_then(|x| x.as_i64())
            .unwrap_or(0),
        u.get("total_tokens").and_then(|x| x.as_i64()).unwrap_or(0),
    )
}

// ---- 转换 ----

fn provider_to_r(m: gateway_provider::Model) -> ProviderR {
    ProviderR {
        id: m.id.to_string(),
        kind: m.kind,
        name: m.name,
        base_url: m.base_url,
        status: m.status,
        has_api_key: !m.api_key_enc.is_empty(),
        created_at: m.created_at.timestamp_millis(),
        updated_at: m.updated_at.timestamp_millis(),
    }
}

fn model_to_r(m: gateway_model::Model, provider_name: Option<String>) -> ModelR {
    ModelR {
        id: m.id.to_string(),
        provider_id: m.provider_id.to_string(),
        name: m.name,
        label: m.label,
        allow_roles: json_to_roles(m.allow_roles.as_ref()),
        enabled: m.enabled,
        daily_token_quota: m.daily_token_quota,
        capabilities: m.capabilities,
        context_window: m.context_window,
        provider_name,
        created_at: m.created_at.timestamp_millis(),
        updated_at: m.updated_at.timestamp_millis(),
    }
}

fn usage_to_r(m: gateway_usage::Model) -> UsageR {
    UsageR {
        id: m.id.to_string(),
        tenant_id: m.tenant_id.map(|t| t.to_string()),
        user_id: m.user_id.to_string(),
        model_id: m.model_id.to_string(),
        prompt_tokens: m.prompt_tokens,
        completion_tokens: m.completion_tokens,
        total_tokens: m.total_tokens,
        status: m.status,
        latency_ms: m.latency_ms,
        created_at: m.created_at.timestamp_millis(),
    }
}

fn audit_to_r(m: gateway_audit::Model) -> AuditR {
    AuditR {
        id: m.id.to_string(),
        tenant_id: m.tenant_id.map(|t| t.to_string()),
        actor: m.actor.to_string(),
        action: m.action,
        resource: m.resource,
        detail: m.detail,
        ip: m.ip,
        created_at: m.created_at.timestamp_millis(),
    }
}

fn roles_to_json(roles: Option<Vec<String>>) -> Option<Value> {
    roles.map(|r| Value::Array(r.into_iter().map(Value::String).collect()))
}

fn json_to_roles(json: Option<&Value>) -> Option<Vec<String>> {
    json.and_then(|j| j.as_array()).map(|arr| {
        arr.iter()
            .filter_map(|v| v.as_str().map(String::from))
            .collect()
    })
}

fn encrypt_api_key(config: &Configure, key: Option<&str>) -> Result<String, GatewayError> {
    match key {
        Some(k) if !k.is_empty() => {
            let aes_key = config.aes_key().ok_or(EncryptionError::InvalidKeyLength)?;
            Ok(encrypt_field(k, aes_key)?)
        }
        _ => Ok(String::new()),
    }
}

fn parse_status(value: Option<&str>) -> Result<String, GatewayError> {
    match value.unwrap_or("ACTIVE") {
        "ACTIVE" | "DISABLED" => Ok(value.unwrap_or("ACTIVE").to_string()),
        _ => Err(GatewayError::BadParam("状态无效".to_string())),
    }
}

fn validate_kind(kind: &str) -> Result<(), GatewayError> {
    match kind {
        "openai" | "anthropic" | "deepseek" | "qwen" | "zhipu" | "ollama" => Ok(()),
        _ => Err(GatewayError::BadParam("供应商类型无效".to_string())),
    }
}

fn parse_uuid(value: &str) -> Result<Uuid, ()> {
    Uuid::parse_str(value).map_err(|_| ())
}

fn db_err(err: sea_orm::DbErr) -> GatewayError {
    GatewayError::Db(err.to_string())
}
