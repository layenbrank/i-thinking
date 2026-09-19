use serde::{Deserialize, Serialize};
use serde_json::Map;
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
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ModelUpdateP {
    pub name: Option<String>,
    pub label: Option<String>,
    pub allow_roles: Option<Vec<String>>,
    pub enabled: Option<bool>,
    pub daily_token_quota: Option<i64>,
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
