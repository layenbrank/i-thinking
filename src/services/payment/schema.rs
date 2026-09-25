use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// 创建订单请求。
///
/// **只接受档位与渠道**：金额由服务端按 `pay.plans` 定价，客户端无法指定价格。
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct OrderP {
    /// 档位名（须同时存在于 `pay.plans` 与 `gateway.planDailyTokenQuota`）
    pub plan: String,
    /// 支付渠道：`WECHAT` / `ALIPAY`
    pub channel: String,
}

/// 订单视图。
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct OrderR {
    #[serde(rename = "orderNo")]
    pub order_no: String,
    #[serde(rename = "tenantID")]
    pub tenant_id: String,
    pub plan: String,
    pub channel: String,
    /// 金额（**分**）
    pub amount: i64,
    pub currency: String,
    /// `PENDING` / `PAID` / `CLOSED` / `REFUNDED`
    pub status: String,
    /// 支付凭证链接（微信 `weixin://wxpay/...`；支付宝 `https://qr.alipay.com/...`），
    /// 客户端据此渲染二维码；异常情况下可能为 null，此时可调用 `sync` 重新获取
    pub code_url: Option<String>,
    /// 上游交易号（微信 `transaction_id` / 支付宝 `trade_no`），未支付为 null
    pub transaction_id: Option<String>,
    /// 开通后生效的订阅 ID，未开通为 null
    #[serde(rename = "subscriptionID")]
    pub subscription_id: Option<String>,
    /// 档位对应的日 token 配额（展示用）
    pub daily_token_quota: i64,
    /// 生效时长（天）；null = 永久
    pub duration_days: Option<i32>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    /// 支付截止时间（超过即自动关单）
    pub order_expires_at: i64,
    pub paid_at: Option<i64>,
    pub remark: Option<String>,
}

/// 可售档位。
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CatalogPlanR {
    pub plan: String,
    pub label: String,
    pub amount: i64,
    pub currency: String,
    /// 生效时长（天）；null = 永久
    pub duration_days: Option<i32>,
    pub daily_token_quota: i64,
    /// 是否可下单（未定价 / 档位已下线时为 false）
    pub purchasable: bool,
    /// 不可下单原因
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

/// 支付渠道。
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CatalogChannelR {
    pub code: String,
    pub label: String,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

/// 价格 / 渠道目录：客户端渲染「档位 → 渠道 → 下单」三步的唯一数据源。
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CatalogR {
    pub currency: String,
    /// 订单有效期（秒）
    pub order_ttl_secs: u64,
    pub plans: Vec<CatalogPlanR>,
    pub channels: Vec<CatalogChannelR>,
    /// 当前租户当前生效档位；null = 免费档
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_plan: Option<String>,
}
