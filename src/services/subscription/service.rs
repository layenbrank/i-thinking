//! 个人租户订阅：付费档位的开通 / 续订 / 取消与生效判定。
//!
//! 配额不落库，档位对应的日 token 配额由 `gateway.plan_daily_token_quota` 提供；
//! 本模块负责「某租户此刻生效的是哪个档位」以及「该租户当前生效的日配额」。

use chrono::{DateTime, FixedOffset, TimeZone, Utc};
use entity::{subscription, tenant};
use fred::interfaces::KeysInterface;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbErr, EntityTrait, QueryFilter, QueryOrder, Set,
    TransactionTrait,
};
use uuid::Uuid;

use crate::clients::redis::RedisPool;
use crate::configures::configure::Configure;
use crate::databases::database::Storage;
use crate::filters::exception::Exception;
use crate::services::subscription::schema::{QuotaR, SubscribeP, SubscriptionR};
use crate::services::tenant::schema::TenantType;
use crate::services::tenant::service::{TenantError, TenantService};
use crate::utils::code::{auth as auth_codes, business, external, request, resource};
use crate::utils::db::is_unique_violation;

/// 订阅状态：生效中 / 已取消 / 已到期。
pub const ACTIVE: &str = "ACTIVE";
pub const CANCELED: &str = "CANCELED";
pub const EXPIRED: &str = "EXPIRED";

/// 生效档位缓存：档位极少变动，避免聊天热路径每次都查库。
const PLAN_CACHE_TTL_SECS: i64 = 60;
/// 缓存「无生效订阅」的哨兵值（Redis 空值无法区分 miss）。
const PLAN_CACHE_NONE: &str = "-";

#[derive(Debug, thiserror::Error)]
pub enum SubscriptionError {
    #[error("Tenant not found")]
    TenantNotFound,
    #[error("Only personal tenants can subscribe")]
    NotPersonal,
    #[error("Insufficient permission")]
    Forbidden,
    #[error("Invalid parameter: {0}")]
    BadParam(String),
    #[error("Subscription not found")]
    NotFound,
    #[error("Subscription conflict")]
    Conflict,
    #[error("Plan requires payment")]
    PlanRequiresPayment,
    #[error("Database error: {0}")]
    Db(String),
}

impl From<SubscriptionError> for Exception {
    fn from(err: SubscriptionError) -> Self {
        match err {
            SubscriptionError::TenantNotFound => {
                Exception::custom(resource::NOT_FOUND, "租户不存在")
            }
            SubscriptionError::NotPersonal => Exception::custom(
                request::INVALID_PARAMETER_VALUE,
                "仅个人租户可订阅，团队租户使用全局配额",
            ),
            SubscriptionError::Forbidden => {
                Exception::custom(auth_codes::INSUFFICIENT_PERMISSIONS, "权限不足")
            }
            SubscriptionError::BadParam(msg) => {
                Exception::custom(request::INVALID_PARAMETER_VALUE, msg)
            }
            SubscriptionError::NotFound => Exception::custom(resource::NOT_FOUND, "订阅不存在"),
            SubscriptionError::Conflict => {
                Exception::custom(resource::ALREADY_EXISTS, "该租户已有生效订阅，请重试")
            }
            SubscriptionError::PlanRequiresPayment => Exception::custom(
                business::payment::PLAN_NOT_PURCHASABLE,
                "该档位需通过支付开通",
            ),
            SubscriptionError::Db(msg) => {
                tracing::error!(error = %msg, "subscription database error");
                Exception::custom(external::DATABASE_ERROR, "数据库错误")
            }
        }
    }
}

/// 日配额来源。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QuotaSource {
    /// 生效订阅档位
    Plan,
    /// 个人租户免费档
    Free,
    /// 全局兜底（团队租户 / 无租户身份）
    Global,
}

impl QuotaSource {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Plan => "PLAN",
            Self::Free => "FREE",
            Self::Global => "GLOBAL",
        }
    }
}

/// 某租户当前生效的日配额。
#[derive(Debug, Clone)]
pub struct QuotaInfo {
    pub source: QuotaSource,
    pub plan: Option<String>,
    pub limit: i64,
}

/// 此刻生效的订阅（供支付等模块计算续费基数）。
#[derive(Debug, Clone)]
pub struct ActiveSubscription {
    pub id: Uuid,
    pub plan: String,
    /// 到期时间；`None` = 永久有效
    pub expires_at: Option<DateTime<FixedOffset>>,
}

pub struct SubscriptionService;

impl SubscriptionService {
    /// 开通 / 续订（自助入口）。
    ///
    /// 自助开通只对**未定价档位**开放：`pay.plans` 里定了价（`amount > 0`）的档位必须走支付流程，
    /// 否则任何租户管理员都能绕过收银台白拿付费配额。平台管理员保留代开通道（客服补单 / 本地联调）。
    pub async fn subscribe(
        db: &Storage,
        config: &Configure,
        redis: &RedisPool,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
        req: SubscribeP,
    ) -> Result<SubscriptionR, SubscriptionError> {
        require_manage(db, user_id, tenant_id, platform_admin).await?;
        ensure_self_service_allowed(config, &req.plan, platform_admin)?;
        Self::grant(db, config, redis, user_id, tenant_id, req).await
    }

    /// 开通 / 续订（可信通道：支付核销后开通、平台管理员代开）。
    ///
    /// 与 [`Self::subscribe`] 的唯一区别是**不做「已定价档位需走支付」的守卫** —— 鉴权与「钱有没有到」
    /// 由调用方保证（支付模块在验签 + 核对金额之后才会调到这里）。
    ///
    /// 订阅**创建即生效**（`createdAt` 即生效时间）。同一租户同一时刻最多一条 ACTIVE 订阅，故在一个
    /// 事务内：
    /// 1. 旧 ACTIVE 订阅——已过期的标 `EXPIRED`；否则标 `CANCELED` 并把 `expiresAt`
    ///    **截断到当前时间**（新订阅即刻接管，续费不浪费剩余天数）；
    /// 2. 插入新订阅。
    pub async fn grant(
        db: &Storage,
        config: &Configure,
        redis: &RedisPool,
        user_id: Uuid,
        tenant_id: Uuid,
        req: SubscribeP,
    ) -> Result<SubscriptionR, SubscriptionError> {
        let tenant = tenant::Entity::find_by_id(tenant_id)
            .one(&db.db)
            .await
            .map_err(db_err)?
            .ok_or(SubscriptionError::TenantNotFound)?;
        if !TenantType::is_personal(&tenant.tenant_type) {
            return Err(SubscriptionError::NotPersonal);
        }

        // 档位必须在配置里有配额，避免写入无法计费的档位名。
        if config.gateway_plan_daily_token_quota(&req.plan).is_none() {
            return Err(SubscriptionError::BadParam(format!(
                "档位不存在或未配置配额: {}",
                req.plan
            )));
        }

        let now = Utc::now().fixed_offset();
        let expires_at = match req.expires_at {
            Some(millis) => Some(from_millis(millis)?),
            None => None,
        };
        if expires_at.is_some_and(|end| end <= now) {
            return Err(SubscriptionError::BadParam(
                "到期时间须晚于当前时间".to_string(),
            ));
        }

        let olds = active_rows(db, tenant_id).await.map_err(db_err)?;
        let txn = db.db.begin().await.map_err(db_err)?;

        for old in olds {
            // 已过期的按 EXPIRED 归档；未结束的统一截断到当前时间（新订阅即刻接管）
            let expired = old.expires_at.is_some_and(|end| end <= now);
            let mut active: subscription::ActiveModel = old.into();
            active.status = Set(if expired { EXPIRED } else { CANCELED }.to_string());
            if !expired {
                active.expires_at = Set(Some(now));
            }
            active.updated_at = Set(now);
            active.updater = Set(Some(user_id));
            active.update(&txn).await.map_err(db_err)?;
        }

        let model = subscription::ActiveModel {
            id: Set(Uuid::new_v4()),
            tenant_id: Set(tenant_id),
            plan: Set(req.plan),
            status: Set(ACTIVE.to_string()),
            expires_at: Set(expires_at),
            archived_at: Set(None),
            created_at: Set(now),
            creator: Set(Some(user_id)),
            updated_at: Set(now),
            updater: Set(Some(user_id)),
        }
        .insert(&txn)
        .await
        .map_err(|err| {
            if is_unique_violation(&err) {
                SubscriptionError::Conflict
            } else {
                db_err(err)
            }
        })?;

        txn.commit().await.map_err(db_err)?;
        cache_invalidate(redis, tenant_id).await;

        Ok(to_r(model))
    }

    /// 租户订阅历史（含已取消 / 已到期），按创建时间倒序。
    ///
    /// 顺带把「已过 `expiresAt` 但仍为 ACTIVE」的订阅标记为 `EXPIRED`（惰性清理，无需定时任务）。
    pub async fn list(
        db: &Storage,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
    ) -> Result<Vec<SubscriptionR>, SubscriptionError> {
        require_member(db, user_id, tenant_id, platform_admin).await?;
        expire_stale(db, tenant_id).await.map_err(db_err)?;

        let rows = subscription::Entity::find()
            .filter(subscription::Column::TenantId.eq(tenant_id))
            .order_by_desc(subscription::Column::CreatedAt)
            .all(&db.db)
            .await
            .map_err(db_err)?;
        Ok(rows.into_iter().map(to_r).collect())
    }

    /// 取消订阅：状态置 CANCELED，并把有效期截断到当前时间。
    pub async fn cancel(
        db: &Storage,
        redis: &RedisPool,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
        subscription_id: Uuid,
    ) -> Result<(), SubscriptionError> {
        require_manage(db, user_id, tenant_id, platform_admin).await?;

        let model = subscription::Entity::find_by_id(subscription_id)
            .filter(subscription::Column::TenantId.eq(tenant_id))
            .one(&db.db)
            .await
            .map_err(db_err)?
            .ok_or(SubscriptionError::NotFound)?;

        let now = Utc::now().fixed_offset();
        let expires_at = match model.expires_at {
            Some(end) if end < now => end,
            _ => now,
        };
        let mut active: subscription::ActiveModel = model.into();
        active.status = Set(CANCELED.to_string());
        active.expires_at = Set(Some(expires_at));
        active.updated_at = Set(now);
        active.updater = Set(Some(user_id));
        active.update(&db.db).await.map_err(db_err)?;

        cache_invalidate(redis, tenant_id).await;
        Ok(())
    }

    /// 租户当前生效配额（含来源与档位），供接口与聊天热路径共用。
    pub async fn effective_quota(
        db: &Storage,
        config: &Configure,
        redis: &RedisPool,
        tenant_id: Option<Uuid>,
    ) -> Result<QuotaInfo, DbErr> {
        let global = QuotaInfo {
            source: QuotaSource::Global,
            plan: None,
            limit: config.gateway_daily_token_quota(),
        };
        let Some(tid) = tenant_id else {
            return Ok(global);
        };
        let Some(member) = tenant::Entity::find_by_id(tid).one(&db.db).await? else {
            return Ok(global);
        };
        if !TenantType::is_personal(&member.tenant_type) {
            return Ok(global);
        }

        match Self::active_plan(db, redis, tid).await? {
            Some(plan) => match config.gateway_plan_daily_token_quota(&plan) {
                Some(limit) => Ok(QuotaInfo {
                    source: QuotaSource::Plan,
                    plan: Some(plan),
                    limit,
                }),
                // 未知档位（配置删改后残留）回落免费档，避免超发
                None => Ok(QuotaInfo {
                    source: QuotaSource::Free,
                    plan: None,
                    limit: config.gateway_free_daily_token_quota(),
                }),
            },
            None => Ok(QuotaInfo {
                source: QuotaSource::Free,
                plan: None,
                limit: config.gateway_free_daily_token_quota(),
            }),
        }
    }

    /// 当前生效配额（接口用；带租户类型与鉴权）。
    pub async fn quota(
        db: &Storage,
        config: &Configure,
        redis: &RedisPool,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
    ) -> Result<QuotaR, SubscriptionError> {
        require_member(db, user_id, tenant_id, platform_admin).await?;

        let member = tenant::Entity::find_by_id(tenant_id)
            .one(&db.db)
            .await
            .map_err(db_err)?
            .ok_or(SubscriptionError::TenantNotFound)?;
        let info = Self::effective_quota(db, config, redis, Some(tenant_id))
            .await
            .map_err(db_err)?;

        Ok(QuotaR {
            tenant_id: tenant_id.to_string(),
            tenant_type: member.tenant_type,
            source: info.source.as_str().to_string(),
            plan: info.plan,
            daily_token_quota: info.limit,
        })
    }

    /// 此刻生效的档位名（无有效订阅则 `None`）。走 Redis 缓存（TTL 60s）。
    ///
    /// 缓存故障时降级为直查数据库，不打断聊天链路。
    pub async fn active_plan(
        db: &Storage,
        redis: &RedisPool,
        tenant_id: Uuid,
    ) -> Result<Option<String>, DbErr> {
        let key = plan_cache_key(tenant_id);
        if let Some(cached) = cache_get(redis, &key).await {
            return Ok(if cached == PLAN_CACHE_NONE {
                None
            } else {
                Some(cached)
            });
        }

        let plan = query_active_plan(db, tenant_id).await?;
        cache_set(redis, &key, plan.as_deref()).await;
        Ok(plan)
    }

    /// 此刻生效的订阅记录（无有效订阅则 `None`）。不走缓存。
    ///
    /// 支付开通需要它来算续费基数：生效订阅未到期时应从其到期时间续期，而不是从当前时间。
    pub async fn active_subscription(
        db: &Storage,
        tenant_id: Uuid,
    ) -> Result<Option<ActiveSubscription>, DbErr> {
        let now = Utc::now().fixed_offset();
        Ok(active_rows(db, tenant_id)
            .await?
            .into_iter()
            .find(|row| in_effect(row, now))
            .map(|row| ActiveSubscription {
                id: row.id,
                plan: row.plan,
                expires_at: row.expires_at,
            }))
    }
}

fn plan_cache_key(tenant_id: Uuid) -> String {
    format!("gateway:plan:{tenant_id}")
}

async fn cache_get(redis: &RedisPool, key: &str) -> Option<String> {
    match redis.pool().get::<Option<String>, _>(key).await {
        Ok(value) => value,
        Err(err) => {
            tracing::warn!(error = %err, "plan cache get failed");
            None
        }
    }
}

async fn cache_set(redis: &RedisPool, key: &str, plan: Option<&str>) {
    let value = plan.unwrap_or(PLAN_CACHE_NONE);
    let result: Result<(), fred::error::Error> = async {
        let _: () = redis.pool().set(key, value, None, None, false).await?;
        let _: () = redis.pool().expire(key, PLAN_CACHE_TTL_SECS, None).await?;
        Ok(())
    }
    .await;
    if let Err(err) = result {
        tracing::warn!(error = %err, "plan cache set failed");
    }
}

/// 失效生效档位缓存。订阅发生变更的模块（如支付开通成功后）应主动调用，避免档位短暂不一致。
pub async fn cache_invalidate(redis: &RedisPool, tenant_id: Uuid) {
    let key = plan_cache_key(tenant_id);
    let result: Result<(), fred::error::Error> = async {
        let _: () = redis.pool().del(key).await?;
        Ok(())
    }
    .await;
    if let Err(err) = result {
        tracing::warn!(error = %err, "plan cache invalidate failed");
    }
}

/// 该租户状态为 ACTIVE 的订阅（未按时间过滤），按创建时间倒序。
async fn active_rows(db: &Storage, tenant_id: Uuid) -> Result<Vec<subscription::Model>, DbErr> {
    subscription::Entity::find()
        .filter(subscription::Column::TenantId.eq(tenant_id))
        .filter(subscription::Column::Status.eq(ACTIVE))
        .filter(subscription::Column::ArchivedAt.is_null())
        .order_by_desc(subscription::Column::CreatedAt)
        .all(&db.db)
        .await
}

/// 实查当前生效档位（走 DB，不带缓存）。
async fn query_active_plan(db: &Storage, tenant_id: Uuid) -> Result<Option<String>, DbErr> {
    let now = Utc::now().fixed_offset();
    let rows = active_rows(db, tenant_id).await?;
    Ok(rows
        .into_iter()
        .find(|row| in_effect(row, now))
        .map(|row| row.plan))
}

/// 惰性把已过 `expiresAt` 的 ACTIVE 订阅标记为 EXPIRED。
async fn expire_stale(db: &Storage, tenant_id: Uuid) -> Result<(), DbErr> {
    let now = Utc::now().fixed_offset();
    for row in active_rows(db, tenant_id).await? {
        if row.expires_at.is_some_and(|end| end <= now) {
            let mut active: subscription::ActiveModel = row.into();
            active.status = Set(EXPIRED.to_string());
            active.updated_at = Set(now);
            active.update(&db.db).await?;
        }
    }
    Ok(())
}

/// 是否仍有效：未到期（`expiresAt` 为空表示永久）。订阅创建即生效，因此无「未开始」状态。
fn in_effect(row: &subscription::Model, now: DateTime<FixedOffset>) -> bool {
    match row.expires_at {
        Some(end) => end > now,
        None => true,
    }
}

/// 自助开通守卫：已定价（`amount > 0`）的档位只能由支付回调开通。
///
/// 判断只看 `pay.plans` 这一张表：配置里删掉定价即恢复自助开通，不需要改代码。
fn ensure_self_service_allowed(
    config: &Configure,
    plan: &str,
    platform_admin: bool,
) -> Result<(), SubscriptionError> {
    if platform_admin {
        return Ok(());
    }
    match config.pay_plan(plan) {
        Some(spec) if spec.amount > 0 => Err(SubscriptionError::PlanRequiresPayment),
        _ => Ok(()),
    }
}

async fn require_member(
    db: &Storage,
    user_id: Uuid,
    tenant_id: Uuid,
    platform_admin: bool,
) -> Result<(), SubscriptionError> {
    TenantService::require_role(db, user_id, tenant_id, platform_admin)
        .await
        .map(|_| ())
        .map_err(role_error)
}

async fn require_manage(
    db: &Storage,
    user_id: Uuid,
    tenant_id: Uuid,
    platform_admin: bool,
) -> Result<(), SubscriptionError> {
    let role = TenantService::require_role(db, user_id, tenant_id, platform_admin)
        .await
        .map_err(role_error)?;
    if role.can_manage() {
        Ok(())
    } else {
        Err(SubscriptionError::Forbidden)
    }
}

/// `require_role` 的 `Db` 错误不能吞成「权限不足」，否则数据库故障会被伪装成 403。
fn role_error(err: TenantError) -> SubscriptionError {
    match err {
        TenantError::Db(msg) => SubscriptionError::Db(msg),
        _ => SubscriptionError::Forbidden,
    }
}

fn from_millis(millis: i64) -> Result<DateTime<FixedOffset>, SubscriptionError> {
    Utc.timestamp_millis_opt(millis)
        .single()
        .map(|dt| dt.fixed_offset())
        .ok_or_else(|| SubscriptionError::BadParam("时间戳无效".to_string()))
}

fn to_r(m: subscription::Model) -> SubscriptionR {
    SubscriptionR {
        id: m.id.to_string(),
        tenant_id: m.tenant_id.to_string(),
        plan: m.plan,
        status: m.status,
        expires_at: m.expires_at.map(|end| end.timestamp_millis()),
        created_at: m.created_at.timestamp_millis(),
        updated_at: m.updated_at.timestamp_millis(),
    }
}

fn db_err(err: DbErr) -> SubscriptionError {
    SubscriptionError::Db(err.to_string())
}

#[cfg(test)]
mod tests {
    use super::{SubscriptionError, ensure_self_service_allowed};
    use crate::configures::configure::{Configure, PayPlanConfig};

    /// 定价档位：`pay.plans` 里有 `amount > 0` 的条目。
    fn priced_config(plan: &str) -> Configure {
        let mut config = Configure::default();
        config.pay.plans.insert(
            plan.to_string(),
            PayPlanConfig {
                amount: 1990,
                duration_days: Some(30),
                label: None,
            },
        );
        config
    }

    #[test]
    fn self_service_cannot_open_a_priced_plan() {
        let config = priced_config("pro");

        assert!(matches!(
            ensure_self_service_allowed(&config, "pro", false),
            Err(SubscriptionError::PlanRequiresPayment)
        ));
    }

    #[test]
    fn platform_admin_may_open_a_priced_plan() {
        let config = priced_config("pro");

        assert!(ensure_self_service_allowed(&config, "pro", true).is_ok());
    }

    #[test]
    fn self_service_still_opens_unpriced_or_unlisted_plans() {
        // 未在 pay.plans 里：可自助开通
        assert!(ensure_self_service_allowed(&priced_config("pro"), "team", false).is_ok());

        // 在 pay.plans 里但未定价（amount <= 0）：视为不可售，可自助开通
        let mut config = Configure::default();
        config.pay.plans.insert(
            "legacy".to_string(),
            PayPlanConfig {
                amount: 0,
                duration_days: Some(30),
                label: None,
            },
        );
        assert!(ensure_self_service_allowed(&config, "legacy", false).is_ok());
    }
}
