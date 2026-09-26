//! 支付订单：下单 → 渠道凭证 → 回调/查单核销 → 开通订阅。
//!
//! 安全与一致性要点（支付域不可放松）：
//! - **服务端权威定价**：客户端只提交 `plan` + `channel`，金额来自 `pay.plans` 并快照落库；
//! - **回调必验签**：验签 → 金额 / 币种核对 → 才允许改单，验签失败一律不改状态；
//! - **幂等**：同一订单重复回调 / 重复查单只开通一次；`PAID` 但未开通（异常中断）可自愈重试；
//! - **惰性关单**：超过 `expiresAt` 的订单在下单 / 查单时被关闭，无需定时任务；
//! - **迟到支付**：订单已关闭后收到成功回调仍会开通（钱已到账），但记 `remark` 并告警，便于对账。

use chrono::{Duration, Utc};
use entity::{payment_order, tenant};
use identity::{TenantId, UserId};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbErr, EntityTrait, QueryFilter, QueryOrder, QuerySelect, Set,
};
use uuid::Uuid;

use crate::clients::redis::RedisPool;
use crate::configures::configure::{Configure, PayPlanConfig};
use crate::databases::database::Storage;
use crate::filters::exception::Exception;
use crate::guards::tenant::TenantScope;
use crate::services::payment::channel::{
    self, ALIPAY, ChannelError, NotifyInput, PrepayInput, WECHAT, availability,
};
use crate::services::payment::schema::{CatalogChannelR, CatalogPlanR, CatalogR, OrderP, OrderR};
use crate::services::subscription::schema::SubscribeP;
use crate::services::subscription::service::{
    SubscriptionError, SubscriptionService, cache_invalidate,
};
use crate::services::tenant::schema::TenantType;
use crate::services::tenant::service::{TenantError, TenantService};
use crate::utils::code::{auth as auth_codes, business, external, request, resource};

/// 待支付。
pub const PENDING: &str = "PENDING";
/// 已支付（并已开通订阅）。
pub const PAID: &str = "PAID";
/// 已关闭（超时 / 主动关单）。
pub const CLOSED: &str = "CLOSED";

/// 平台结算币种（微信、支付宝当前仅支持人民币）。
const CURRENCY: &str = "CNY";

/// 订单号随机段长度（配合秒级时间戳，冲突概率可忽略且订单号仍在 32 字符内）。
const ORDER_NO_RANDOM_LEN: usize = 8;

/// 订单列表一次最多返回的条数（设置页只需最近几条）。
const ORDER_LIST_MAX: u64 = 50;

#[derive(Debug, thiserror::Error)]
pub enum PaymentError {
    #[error("Tenant not found")]
    TenantNotFound,
    #[error("Only personal tenants can purchase")]
    NotPersonal,
    #[error("Insufficient permission")]
    Forbidden,
    #[error("Invalid parameter: {0}")]
    BadParam(String),
    #[error("Plan not purchasable: {0}")]
    PlanNotPurchasable(String),
    #[error("Order not found")]
    OrderNotFound,
    #[error("Order closed")]
    OrderClosed,
    #[error("Order expired")]
    OrderExpired,
    #[error("Amount mismatch")]
    AmountMismatch,
    #[error("Channel unavailable: {0}")]
    ChannelUnavailable(String),
    #[error("Signature invalid: {0}")]
    Signature(String),
    #[error("Upstream error: {0}")]
    Upstream(String),
    #[error("Database error: {0}")]
    Db(String),
}

impl From<PaymentError> for Exception {
    fn from(err: PaymentError) -> Self {
        match err {
            PaymentError::TenantNotFound => Exception::custom(resource::NOT_FOUND, "租户不存在"),
            PaymentError::NotPersonal => Exception::custom(
                request::INVALID_PARAMETER_VALUE,
                "仅个人租户可购买档位，团队租户使用全局配额",
            ),
            PaymentError::Forbidden => {
                Exception::custom(auth_codes::INSUFFICIENT_PERMISSIONS, "权限不足")
            }
            PaymentError::BadParam(msg) => Exception::custom(request::INVALID_PARAMETER_VALUE, msg),
            PaymentError::PlanNotPurchasable(msg) => {
                Exception::custom(business::payment::PLAN_NOT_PURCHASABLE, msg)
            }
            PaymentError::OrderNotFound => {
                Exception::custom(business::payment::ORDER_NOT_FOUND, "订单不存在")
            }
            PaymentError::OrderClosed => {
                Exception::custom(business::payment::ORDER_CLOSED, "订单已关闭，请重新下单")
            }
            PaymentError::OrderExpired => {
                Exception::custom(business::payment::ORDER_EXPIRED, "订单已过期，请重新下单")
            }
            PaymentError::AmountMismatch => Exception::custom(
                business::payment::AMOUNT_MISMATCH,
                "支付金额与订单不一致，已挂起待人工核对",
            ),
            PaymentError::ChannelUnavailable(reason) => Exception::custom(
                business::payment::CHANNEL_UNAVAILABLE,
                format!("支付渠道不可用：{reason}"),
            ),
            PaymentError::Signature(msg) => Exception::custom(
                business::payment::SIGNATURE_INVALID,
                format!("支付签名校验失败：{msg}"),
            ),
            PaymentError::Upstream(msg) => {
                tracing::error!(error = %msg, "payment upstream error");
                Exception::custom(business::payment::UPSTREAM_ERROR, "支付渠道返回错误")
            }
            PaymentError::Db(msg) => {
                tracing::error!(error = %msg, "payment database error");
                Exception::custom(external::DATABASE_ERROR, "数据库错误")
            }
        }
    }
}

impl From<ChannelError> for PaymentError {
    fn from(err: ChannelError) -> Self {
        match err {
            ChannelError::Unavailable(reason) => Self::ChannelUnavailable(reason),
            ChannelError::Unsupported(code) => Self::BadParam(format!("不支持的支付渠道: {code}")),
            ChannelError::Signature(msg) => Self::Signature(msg),
            ChannelError::Malformed(msg) => Self::BadParam(msg),
            ChannelError::Upstream(msg) => Self::Upstream(msg),
        }
    }
}

pub struct PaymentService;

impl PaymentService {
    /// 价格 / 渠道目录：客户端渲染「档位 → 渠道 → 下单」的唯一数据源。
    pub async fn catalog(
        db: &Storage,
        config: &Configure,
        redis: &RedisPool,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
    ) -> Result<CatalogR, PaymentError> {
        require_member(db, user_id, tenant_id, platform_admin).await?;

        let plans = config
            .pay_plans()
            .map(|(name, spec)| {
                let reason = unsellable_reason(config, name, spec);
                CatalogPlanR {
                    plan: name.clone(),
                    label: spec.label.clone().unwrap_or_else(|| name.clone()),
                    amount: spec.amount,
                    currency: CURRENCY.to_string(),
                    duration_days: spec.duration_days,
                    daily_token_quota: config.gateway_plan_daily_token_quota(name).unwrap_or(0),
                    purchasable: reason.is_none(),
                    reason,
                }
            })
            .collect::<Vec<_>>();

        let channels = [WECHAT, ALIPAY]
            .iter()
            .map(|code| {
                let (code, label, enabled, reason) = availability(config, code);
                CatalogChannelR {
                    code,
                    label,
                    enabled,
                    reason,
                }
            })
            .collect();

        Ok(CatalogR {
            currency: CURRENCY.to_string(),
            order_ttl_secs: config.pay_order_ttl_secs(),
            plans,
            channels,
            current_plan: SubscriptionService::active_plan(db, redis, tenant_id)
                .await
                .map_err(db_err)?,
        })
    }

    /// 下单：返回可渲染二维码的 `codeUrl`。
    ///
    /// 同一用户 + 档位 + 渠道的未过期待支付订单会被复用，避免反复点击产生一堆并行订单。
    pub async fn create(
        db: &Storage,
        config: &Configure,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
        req: OrderP,
    ) -> Result<OrderR, PaymentError> {
        require_manage(db, user_id, tenant_id, platform_admin).await?;
        require_personal_tenant(db, tenant_id).await?;

        let channel_code = channel::require_ready(config, &req.channel)?.code;
        let spec = config
            .pay_plan(&req.plan)
            .ok_or_else(|| PaymentError::PlanNotPurchasable("档位未定价或已下线".to_string()))?;
        if let Some(reason) = unsellable_reason(config, &req.plan, spec) {
            return Err(PaymentError::PlanNotPurchasable(reason));
        }

        close_stale(db, tenant_id).await?;

        if let Some(existing) = payment_order::Entity::find()
            .filter(payment_order::Column::TenantId.eq(tenant_id))
            .filter(payment_order::Column::UserId.eq(user_id))
            .filter(payment_order::Column::Plan.eq(req.plan.as_str()))
            .filter(payment_order::Column::Channel.eq(channel_code))
            .filter(payment_order::Column::Status.eq(PENDING))
            .filter(payment_order::Column::ArchivedAt.is_null())
            .one(&db.db)
            .await
            .map_err(db_err)?
        {
            // 已有二维码直接复用；下单时上游抖动导致无凭证的订单则补一次
            if existing.code_url.is_some() {
                return Ok(to_r(existing, config));
            }
            return Self::prepay_and_store(db, config, existing).await;
        }

        let now = Utc::now().fixed_offset();
        let order = payment_order::ActiveModel {
            id: Set(Uuid::new_v4()),
            order_no: Set(order_no()),
            tenant_id: Set(tenant_id),
            user_id: Set(user_id),
            plan: Set(req.plan),
            channel: Set(channel_code.to_string()),
            amount: Set(spec.amount),
            currency: Set(CURRENCY.to_string()),
            status: Set(PENDING.to_string()),
            duration_days: Set(spec.duration_days),
            transaction_id: Set(None),
            code_url: Set(None),
            subscription_id: Set(None),
            paid_at: Set(None),
            expires_at: Set(now + Duration::seconds(config.pay_order_ttl_secs() as i64)),
            remark: Set(None),
            archived_at: Set(None),
            created_at: Set(now),
            creator: Set(Some(user_id)),
            updated_at: Set(now),
            updater: Set(Some(user_id)),
        }
        .insert(&db.db)
        .await
        .map_err(db_err)?;

        Self::prepay_and_store(db, config, order).await
    }

    /// 订单详情（按租户隔离）。
    pub async fn get(
        db: &Storage,
        config: &Configure,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
        order_no: &str,
    ) -> Result<OrderR, PaymentError> {
        require_member(db, user_id, tenant_id, platform_admin).await?;
        Ok(to_r(load(db, tenant_id, order_no).await?, config))
    }

    /// 订单列表（按创建时间倒序）：设置页「订单历史」；顺带惰性关单，展示的状态不会过期。
    pub async fn list(
        db: &Storage,
        config: &Configure,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
        limit: u64,
    ) -> Result<Vec<OrderR>, PaymentError> {
        require_member(db, user_id, tenant_id, platform_admin).await?;
        close_stale(db, tenant_id).await?;

        let orders = payment_order::Entity::find()
            .filter(payment_order::Column::TenantId.eq(tenant_id))
            .filter(payment_order::Column::ArchivedAt.is_null())
            .order_by_desc(payment_order::Column::CreatedAt)
            .limit(limit.clamp(1, ORDER_LIST_MAX))
            .all(&db.db)
            .await
            .map_err(db_err)?;
        Ok(orders
            .into_iter()
            .map(|order| to_r(order, config))
            .collect())
    }

    /// 主动查单：回调丢失时的兜底，也是「刷新支付状态」按钮的实现。
    ///
    /// - 已收款未开通（异常中断）→ 自愈补齐订阅；
    /// - 待支付已过期 → 关单；
    /// - 待支付但缺二维码 → 补下单拿新凭证；
    /// - 其余情况向上游查单，成功即核销。
    pub async fn sync(
        db: &Storage,
        config: &Configure,
        redis: &RedisPool,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
        order_no: &str,
    ) -> Result<OrderR, PaymentError> {
        require_member(db, user_id, tenant_id, platform_admin).await?;
        let order = load(db, tenant_id, order_no).await?;

        if order.status == PAID {
            if order.subscription_id.is_some() {
                return Ok(to_r(order, config));
            }
            return Self::settle(db, config, redis, order, None).await;
        }
        if order.status != PENDING {
            return Err(PaymentError::OrderClosed);
        }
        if order.expires_at <= Utc::now().fixed_offset() {
            mark_closed(db, order, "超时未支付", None).await?;
            return Err(PaymentError::OrderExpired);
        }
        if order.code_url.is_none() {
            return Self::prepay_and_store(db, config, order).await;
        }

        let remote = channel::query(config, &order.channel, &order.order_no).await?;
        if remote.paid {
            return Self::settle(db, config, redis, order, remote.transaction_id).await;
        }
        if remote.closed {
            mark_closed(db, order, "上游已关单", None).await?;
            return Err(PaymentError::OrderClosed);
        }
        Ok(to_r(order, config))
    }

    /// 主动关单：用户取消支付。
    pub async fn close(
        db: &Storage,
        config: &Configure,
        user_id: Uuid,
        tenant_id: Uuid,
        platform_admin: bool,
        order_no: &str,
    ) -> Result<OrderR, PaymentError> {
        require_manage(db, user_id, tenant_id, platform_admin).await?;
        let order = load(db, tenant_id, order_no).await?;
        if order.status == PAID {
            return Err(PaymentError::BadParam(
                "订单已支付，无法关闭；如需退款请走原渠道退款流程".to_string(),
            ));
        }
        if order.status == CLOSED {
            return Ok(to_r(order, config));
        }
        Ok(to_r(
            mark_closed(db, order, "用户取消", Some(user_id)).await?,
            config,
        ))
    }

    /// 渠道回调：验签 + 核销。
    ///
    /// 调用方（控制器）负责按渠道约定应答：微信 JSON、支付宝纯文本 `success`，
    /// 且**不能**经过平台响应信封。
    pub async fn notify(
        db: &Storage,
        config: &Configure,
        redis: &RedisPool,
        channel_code: &str,
        input: NotifyInput<'_>,
    ) -> Result<(), PaymentError> {
        let outcome = channel::verify_notify(config, channel_code, &input)?;
        let order = payment_order::Entity::find()
            .filter(payment_order::Column::OrderNo.eq(outcome.order_no.as_str()))
            .filter(payment_order::Column::ArchivedAt.is_null())
            .one(&db.db)
            .await
            .map_err(db_err)?
            .ok_or(PaymentError::OrderNotFound)?;

        // 回调必须来自下单时选定的渠道，否则不予采信
        if channel::find(channel_code).map(|spec| spec.code) != Some(order.channel.as_str()) {
            return Err(PaymentError::Signature(format!(
                "订单 {} 支付渠道不匹配",
                order.order_no
            )));
        }
        if order.status == PAID && order.subscription_id.is_some() {
            return Ok(());
        }
        if !outcome.paid {
            tracing::info!(order_no = %order.order_no, trade_state = "non-success", "payment notify ignored");
            return Ok(());
        }

        // 金额 / 币种核对：不一致绝不开通，留 remark 供人工对账
        if outcome.amount != order.amount || !outcome.currency.eq_ignore_ascii_case(&order.currency)
        {
            let remark = format!(
                "金额不符：应付 {} {}，实收 {} {}",
                order.amount, order.currency, outcome.amount, outcome.currency
            );
            tracing::error!(order_no = %order.order_no, remark = %remark, "payment amount mismatch");
            set_remark(db, &order, &remark).await?;
            return Err(PaymentError::AmountMismatch);
        }

        if order.status == CLOSED {
            tracing::warn!(
                order_no = %order.order_no,
                "late payment accepted for closed order; activating subscription"
            );
        }

        Self::settle(db, config, redis, order, outcome.transaction_id).await?;
        Ok(())
    }

    /// 向上游下单并把凭证落库；失败即关单，避免留下永远没有二维码的待支付订单。
    async fn prepay_and_store(
        db: &Storage,
        config: &Configure,
        order: payment_order::Model,
    ) -> Result<OrderR, PaymentError> {
        let subject = subject_of(config, &order);
        let input = PrepayInput {
            order_no: &order.order_no,
            amount: order.amount,
            currency: &order.currency,
            subject: &subject,
            expires_at: order.expires_at,
        };
        match channel::prepay(config, &order.channel, &input).await {
            Ok(code_url) => {
                let now = Utc::now().fixed_offset();
                let mut active: payment_order::ActiveModel = order.into();
                active.code_url = Set(Some(code_url));
                active.updated_at = Set(now);
                let saved = active.update(&db.db).await.map_err(db_err)?;
                Ok(to_r(saved, config))
            }
            Err(err) => {
                let reason = err.to_string();
                tracing::error!(order_no = %order.order_no, error = %reason, "prepay failed");
                mark_closed(db, order, &format!("下单失败：{reason}"), None).await?;
                Err(PaymentError::from(err))
            }
        }
    }

    /// 核销订单并开通订阅（幂等）。
    ///
    /// 先尝试把订单从 `PENDING` / `CLOSED` **条件更新**为 `PAID`：并发回调只有一次能翻转，
    /// 翻转成功者负责开通订阅；未翻转成功者回读最新状态，若仍未开通则接手开通（自愈）。
    async fn settle(
        db: &Storage,
        config: &Configure,
        redis: &RedisPool,
        order: payment_order::Model,
        transaction_id: Option<String>,
    ) -> Result<OrderR, PaymentError> {
        if order.status == PAID && order.subscription_id.is_some() {
            return Ok(to_r(order, config));
        }

        let now = Utc::now().fixed_offset();
        let transaction = transaction_id.or_else(|| order.transaction_id.clone());
        let order = if order.status == PAID {
            order
        } else {
            let result = payment_order::Entity::update_many()
                .col_expr(
                    payment_order::Column::Status,
                    sea_orm::sea_query::Expr::value(PAID),
                )
                .col_expr(
                    payment_order::Column::PaidAt,
                    sea_orm::sea_query::Expr::value(now),
                )
                .col_expr(
                    payment_order::Column::UpdatedAt,
                    sea_orm::sea_query::Expr::value(now),
                )
                .filter(payment_order::Column::Id.eq(order.id))
                .filter(payment_order::Column::Status.is_in([PENDING, CLOSED]))
                .exec(&db.db)
                .await
                .map_err(db_err)?;

            let latest = payment_order::Entity::find_by_id(order.id)
                .one(&db.db)
                .await
                .map_err(db_err)?
                .ok_or(PaymentError::OrderNotFound)?;
            if result.rows_affected == 0 && latest.subscription_id.is_some() {
                return Ok(to_r(latest, config));
            }
            latest
        };

        Self::activate(db, config, redis, order, transaction).await
    }

    /// 按订单快照开通 / 续订订阅，并回写 `subscriptionID`。
    async fn activate(
        db: &Storage,
        config: &Configure,
        redis: &RedisPool,
        order: payment_order::Model,
        transaction_id: Option<String>,
    ) -> Result<OrderR, PaymentError> {
        if order.subscription_id.is_some() {
            return Ok(to_r(order, config));
        }

        // 续费不浪费剩余时长：生效订阅未到期时从其到期时间续期
        let base = SubscriptionService::active_subscription(db, order.tenant_id)
            .await
            .map_err(db_err)?
            .and_then(|active| active.expires_at)
            .filter(|end| *end > Utc::now().fixed_offset())
            .unwrap_or_else(|| Utc::now().fixed_offset());
        let expires_at = order
            .duration_days
            .map(|days| (base + Duration::days(days as i64)).timestamp_millis());

        // 订阅写入走租户作用域（机器路径：验签与金额核对都已在本函数之前完成）。
        // 作用域只包住这一次写入：冲突即回滚，不跨越后面的订单回写。
        let scope = TenantScope::open(db, TenantId::from_uuid(order.tenant_id))
            .await
            .map_err(|err| PaymentError::Db(err.to_string()))?;
        let granted = SubscriptionService::grant(
            &scope,
            config,
            redis,
            UserId::from_uuid(order.user_id),
            SubscribeP {
                plan: order.plan.clone(),
                expires_at,
            },
        )
        .await;
        if granted.is_ok() {
            scope
                .commit()
                .await
                .map_err(|err| PaymentError::Db(err.to_string()))?;
        } else {
            scope
                .rollback()
                .await
                .map_err(|err| PaymentError::Db(err.to_string()))?;
        }

        let subscription_id = match granted {
            Ok(item) => Uuid::parse_str(&item.id).ok(),
            // 并发核销下另一方已完成开通：回读生效订阅作为本次结果（订阅集合等价）
            Err(SubscriptionError::Conflict) => {
                tracing::warn!(order_no = %order.order_no, "subscription activated concurrently");
                SubscriptionService::active_subscription(db, order.tenant_id)
                    .await
                    .map_err(db_err)?
                    .map(|active| active.id)
            }
            Err(err) => {
                // 已收款但开通失败：保留 PAID + 空 subscriptionID，等待下次 sync 自愈或人工处理
                let remark = format!("已收款，开通订阅失败：{err}");
                tracing::error!(order_no = %order.order_no, error = %remark, "activate failed");
                set_remark(db, &order, &remark).await?;
                return Err(PaymentError::Db(err.to_string()));
            }
        };

        let late_payment = order.status == CLOSED;
        let previous_remark = order.remark.clone();
        let now = Utc::now().fixed_offset();
        let mut active: payment_order::ActiveModel = order.into();
        let previous_transaction_id = active.transaction_id.take().flatten();
        let previous_paid_at = active.paid_at.take().flatten();
        active.status = Set(PAID.to_string());
        active.transaction_id = Set(transaction_id.or(previous_transaction_id));
        active.subscription_id = Set(subscription_id);
        active.remark = Set(if late_payment {
            Some("迟到支付：订单已关闭后收到成功回调，已开通订阅".to_string())
        } else {
            previous_remark
        });
        active.paid_at = Set(previous_paid_at.or(Some(now)));
        active.updated_at = Set(now);
        let saved = active.update(&db.db).await.map_err(db_err)?;

        // 订阅变更后立刻失效档位缓存，避免「已付款但配额仍是免费档」的观感问题
        cache_invalidate(redis, saved.tenant_id).await;
        Ok(to_r(saved, config))
    }
}

/// 展示用套餐名：`i-Thinking <档位> <时长>` / 永久。
fn subject_of(config: &Configure, order: &payment_order::Model) -> String {
    let label = config
        .pay_plan(&order.plan)
        .and_then(|spec| spec.label.clone())
        .unwrap_or_else(|| order.plan.clone());
    match order.duration_days {
        Some(days) => format!("i-Thinking {label} {days} 天"),
        None => format!("i-Thinking {label} 永久"),
    }
}

/// 平台订单号：`P` + 秒级 UTC 时间戳 + 随机段，仅字母数字（微信 `out_trade_no` 约束）。
fn order_no() -> String {
    const ALPHABET: &[u8] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let mut random = String::with_capacity(ORDER_NO_RANDOM_LEN);
    for byte in Uuid::new_v4().as_bytes().iter().take(ORDER_NO_RANDOM_LEN) {
        random.push(ALPHABET[(*byte as usize) % ALPHABET.len()] as char);
    }
    format!("P{}{}", Utc::now().format("%Y%m%d%H%M%S"), random)
}

async fn load(
    db: &Storage,
    tenant_id: Uuid,
    order_no: &str,
) -> Result<payment_order::Model, PaymentError> {
    payment_order::Entity::find()
        .filter(payment_order::Column::TenantId.eq(tenant_id))
        .filter(payment_order::Column::OrderNo.eq(order_no))
        .filter(payment_order::Column::ArchivedAt.is_null())
        .one(&db.db)
        .await
        .map_err(db_err)?
        .ok_or(PaymentError::OrderNotFound)
}

/// 惰性关单：关闭该租户所有已过期的待支付订单。
async fn close_stale(db: &Storage, tenant_id: Uuid) -> Result<(), PaymentError> {
    let now = Utc::now().fixed_offset();
    payment_order::Entity::update_many()
        .col_expr(
            payment_order::Column::Status,
            sea_orm::sea_query::Expr::value(CLOSED),
        )
        .col_expr(
            payment_order::Column::Remark,
            sea_orm::sea_query::Expr::value("超时未支付"),
        )
        .col_expr(
            payment_order::Column::UpdatedAt,
            sea_orm::sea_query::Expr::value(now),
        )
        .filter(payment_order::Column::TenantId.eq(tenant_id))
        .filter(payment_order::Column::Status.eq(PENDING))
        .filter(payment_order::Column::ExpiresAt.lte(now))
        .filter(payment_order::Column::ArchivedAt.is_null())
        .exec(&db.db)
        .await
        .map_err(db_err)?;
    Ok(())
}

async fn mark_closed(
    db: &Storage,
    order: payment_order::Model,
    remark: &str,
    updater: Option<Uuid>,
) -> Result<payment_order::Model, PaymentError> {
    let now = Utc::now().fixed_offset();
    let mut active: payment_order::ActiveModel = order.into();
    active.status = Set(CLOSED.to_string());
    active.remark = Set(Some(remark.to_string()));
    active.updated_at = Set(now);
    if updater.is_some() {
        active.updater = Set(updater);
    }
    active.update(&db.db).await.map_err(db_err)
}

/// 只写备注，不改状态（用于「已收款但开通失败」「金额不符」这类待人工核对的情况）。
async fn set_remark(
    db: &Storage,
    order: &payment_order::Model,
    remark: &str,
) -> Result<(), PaymentError> {
    payment_order::Entity::update_many()
        .col_expr(
            payment_order::Column::Remark,
            sea_orm::sea_query::Expr::value(remark),
        )
        .col_expr(
            payment_order::Column::UpdatedAt,
            sea_orm::sea_query::Expr::value(Utc::now().fixed_offset()),
        )
        .filter(payment_order::Column::Id.eq(order.id))
        .exec(&db.db)
        .await
        .map_err(db_err)?;
    Ok(())
}

fn to_r(order: payment_order::Model, config: &Configure) -> OrderR {
    OrderR {
        order_no: order.order_no,
        tenant_id: order.tenant_id.to_string(),
        plan: order.plan.clone(),
        channel: order.channel,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        code_url: order.code_url,
        transaction_id: order.transaction_id,
        subscription_id: order.subscription_id.map(|id| id.to_string()),
        daily_token_quota: config
            .gateway_plan_daily_token_quota(&order.plan)
            .unwrap_or(0),
        duration_days: order.duration_days,
        created_at: order.created_at.timestamp_millis(),
        order_expires_at: order.expires_at.timestamp_millis(),
        paid_at: order.paid_at.map(|at| at.timestamp_millis()),
        remark: order.remark,
    }
}

async fn require_member(
    db: &Storage,
    user_id: Uuid,
    tenant_id: Uuid,
    platform_admin: bool,
) -> Result<(), PaymentError> {
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
) -> Result<(), PaymentError> {
    let role = TenantService::require_role(db, user_id, tenant_id, platform_admin)
        .await
        .map_err(role_error)?;
    if role.can_manage() {
        Ok(())
    } else {
        Err(PaymentError::Forbidden)
    }
}

async fn require_personal_tenant(db: &Storage, tenant_id: Uuid) -> Result<(), PaymentError> {
    let member = tenant::Entity::find_by_id(tenant_id)
        .one(&db.db)
        .await
        .map_err(db_err)?
        .ok_or(PaymentError::TenantNotFound)?;
    if TenantType::is_personal(&member.tenant_type) {
        Ok(())
    } else {
        Err(PaymentError::NotPersonal)
    }
}

/// 档位不可售的原因（`None` = 可售）。
///
/// 定价与配额两条硬条件：`amount <= 0` 视为未定价（不可售），缺 `gateway.plan_daily_token_quota`
/// 会导致开通后无法计费。目录与下单共用同一判断，界面上的置灰理由和后端的拒绝理由永远一致。
fn unsellable_reason(config: &Configure, plan: &str, spec: &PayPlanConfig) -> Option<String> {
    if spec.amount <= 0 {
        return Some("档位未定价，暂不可购买".to_string());
    }
    if config.gateway_plan_daily_token_quota(plan).is_none() {
        return Some("档位缺少日配额配置，暂不可购买".to_string());
    }
    None
}

/// 数据库故障不能伪装成「权限不足」，否则排查方向会被带偏。
fn role_error(err: TenantError) -> PaymentError {
    match err {
        TenantError::Db(msg) => PaymentError::Db(msg),
        _ => PaymentError::Forbidden,
    }
}

fn db_err(err: DbErr) -> PaymentError {
    PaymentError::Db(err.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn order_no_is_alphanumeric_and_within_upstream_limit() {
        let first = order_no();
        assert!(first.starts_with('P'));
        assert!(first.len() >= 6 && first.len() <= 32, "len={}", first.len());
        assert!(first.chars().all(|ch| ch.is_ascii_alphanumeric()));
        assert_ne!(first, order_no());
    }

    #[test]
    fn amount_mismatch_maps_to_business_code() {
        let exception = Exception::from(PaymentError::AmountMismatch);
        assert_eq!(exception.code, business::payment::AMOUNT_MISMATCH);
    }

    #[test]
    fn channel_errors_map_to_expected_codes() {
        let unavailable = Exception::from(PaymentError::from(ChannelError::Unavailable(
            "渠道未开通".to_string(),
        )));
        assert_eq!(unavailable.code, business::payment::CHANNEL_UNAVAILABLE);
        let signature = Exception::from(PaymentError::from(ChannelError::Signature(
            "回调签名校验失败".to_string(),
        )));
        assert_eq!(signature.code, business::payment::SIGNATURE_INVALID);
    }

    #[test]
    fn a_plan_needs_a_price_and_a_quota_to_be_sellable() {
        let spec = PayPlanConfig {
            amount: 1990,
            duration_days: Some(30),
            label: None,
        };
        let mut config = Configure::default();

        // 缺日配额：开通后无法计费
        assert_eq!(
            unsellable_reason(&config, "pro", &spec).as_deref(),
            Some("档位缺少日配额配置，暂不可购买")
        );

        config
            .gateway
            .plan_daily_token_quota
            .insert("pro".to_string(), 5_000_000);
        assert!(unsellable_reason(&config, "pro", &spec).is_none());

        // 未定价（amount <= 0）：收银台不能卖
        let free = PayPlanConfig {
            amount: 0,
            duration_days: Some(30),
            label: None,
        };
        assert_eq!(
            unsellable_reason(&config, "pro", &free).as_deref(),
            Some("档位未定价，暂不可购买")
        );
    }
}
