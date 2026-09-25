use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use utoipa::ToSchema;

/// OpenAI 兼容 chat/completions 请求；`model` 用于解析上游，其余字段原样透传。
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ChatCompletionsP {
    pub model: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
    /// messages / tools / temperature / … 原样透传给上游供应商
    #[serde(flatten)]
    pub extra: Map<String, serde_json::Value>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProviderWriteP {
    /// openai / anthropic / deepseek / qwen / zhipu / ollama
    pub kind: String,
    pub name: String,
    pub base_url: String,
    /// 明文 API Key；入库前 AES 加密
    pub api_key: Option<String>,
    /// ACTIVE / DISABLED
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProviderUpdateP {
    pub kind: Option<String>,
    pub name: Option<String>,
    pub base_url: Option<String>,
    /// 提供时重新加密；缺省保留原密钥
    pub api_key: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProviderR {
    pub id: String,
    pub kind: String,
    pub name: String,
    pub base_url: String,
    pub status: String,
    /// 是否已托管密钥（不回传明文/密文）
    pub has_api_key: bool,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ModelWriteP {
    #[serde(rename = "providerID")]
    pub provider_id: String,
    /// 模型标识（如 gpt-4o）
    pub name: String,
    pub label: String,
    /// 允许调用的角色；空 = 全角色放行
    pub allow_roles: Option<Vec<String>>,
    pub enabled: Option<bool>,
    /// 日 token 配额；0 = 继承租户
    pub daily_token_quota: Option<i64>,
    /// 能力声明（`{"tools":true,"reasoning":true,"vision":false}`）；缺省 = 未声明
    #[schema(value_type = Object, nullable = true)]
    pub capabilities: Option<Value>,
    /// 上下文窗口（token）；缺省或 ≤ 0 = 未知
    pub context_window: Option<i64>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ModelUpdateP {
    pub name: Option<String>,
    pub label: Option<String>,
    pub allow_roles: Option<Vec<String>>,
    pub enabled: Option<bool>,
    pub daily_token_quota: Option<i64>,
    /// 提供即覆盖；空对象 / null 表示清空声明
    #[schema(value_type = Object, nullable = true)]
    pub capabilities: Option<Value>,
    /// 提供即覆盖；≤ 0 表示清空（未知）
    pub context_window: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ModelR {
    pub id: String,
    #[serde(rename = "providerID")]
    pub provider_id: String,
    pub name: String,
    pub label: String,
    pub allow_roles: Option<Vec<String>>,
    pub enabled: bool,
    pub daily_token_quota: i64,
    /// 能力声明；未声明时不下发（客户端按默认兜底）
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Object, nullable = true)]
    pub capabilities: Option<Value>,
    /// 上下文窗口（token）；未知时不下发
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context_window: Option<i64>,
    /// 上游供应商展示名。用户面目录下发给**所有**登录用户（含非管理员，
    /// 他们读不到 `/gateway/providers`），客户端据此展示模型挂在谁家。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_name: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UsageQueryP {
    #[serde(rename = "tenantID")]
    pub tenant_id: Option<String>,
    #[serde(rename = "modelID")]
    pub model_id: Option<String>,
    pub from: Option<i64>,
    pub to: Option<i64>,
    pub page: Option<u32>,
    pub size: Option<u32>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AuditQueryP {
    #[serde(rename = "tenantID")]
    pub tenant_id: Option<String>,
    pub page: Option<u32>,
    pub size: Option<u32>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UsageR {
    pub id: String,
    #[serde(rename = "tenantID")]
    pub tenant_id: Option<String>,
    #[serde(rename = "userID")]
    pub user_id: String,
    #[serde(rename = "modelID")]
    pub model_id: String,
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
    pub total_tokens: i64,
    pub status: String,
    pub latency_ms: i64,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AuditR {
    pub id: String,
    #[serde(rename = "tenantID")]
    pub tenant_id: Option<String>,
    pub actor: String,
    pub action: String,
    pub resource: String,
    pub detail: Option<serde_json::Value>,
    pub ip: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
}

/// 自助配额查询参数。
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SelfQuotaP {
    /// 目录里的模型名；缺省（或 `auto`）时按身份级配额回答
    pub model: Option<String>,
}

/// 当前身份此刻的日窗配额状态（只读：不改计数、不落库）。
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SelfQuotaR {
    /// 配额归属：`TENANT`（有租户身份）/ `USER`（无租户身份）
    pub scope: String,
    #[serde(rename = "scopeID")]
    pub scope_id: String,
    #[serde(rename = "tenantID", skip_serializing_if = "Option::is_none")]
    pub tenant_id: Option<String>,
    /// 归属租户类型：`PERSONAL` / `TEAM`；无租户身份时不发
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tenant_type: Option<String>,
    /// 上限来源：`MODEL` 单模型覆盖 / `PLAN` 订阅档位 / `FREE` 免费档 / `GLOBAL` 全局兜底
    pub source: String,
    /// 档位名；仅 `PLAN` 有
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan: Option<String>,
    /// 日配额上限（token）
    pub limit: i64,
    /// 今日已用（token，取 Redis 日窗计数）
    pub used: i64,
    /// 剩余（不小于 0）
    pub remaining: i64,
    /// 是否已触顶；触顶后平台模型的新请求会被拒（400006）
    pub exhausted: bool,
    /// 日窗重置时刻（毫秒时间戳）
    #[serde(rename = "resetsAt")]
    pub resets_at: i64,
}

/// 可开通档位：配额数字来自 `gateway.plan_daily_token_quota`，不落库。
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PlanR {
    pub plan: String,
    #[serde(rename = "dailyTokenQuota")]
    pub daily_token_quota: i64,
}

/// 档位目录：可开通档位 + 免费档基线。
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PlansR {
    pub plans: Vec<PlanR>,
    #[serde(rename = "freeDailyTokenQuota")]
    pub free_daily_token_quota: i64,
}
