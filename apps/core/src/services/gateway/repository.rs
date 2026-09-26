//! 网关领域的落库与 ES 索引（用量/审计）。

use anyhow::{Context, Result};
use chrono::Utc;
use elasticsearch::IndexParts;
use entity::{gateway_audit, gateway_usage};
use sea_orm::{ActiveModelTrait, DatabaseTransaction, Set};
use serde_json::{Value, json};
use uuid::Uuid;

use crate::clients::elasticsearch::EsClient;

/// 一次模型调用的用量输入。
pub struct UsageInput {
    pub tenant_id: Option<Uuid>,
    pub user_id: Uuid,
    pub provider_id: Uuid,
    pub model_id: Uuid,
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
    pub total_tokens: i64,
    pub status: String,
    pub latency_ms: i64,
}

/// 落一行用量；事务由调用方提供（必须是租户或账号作用域，否则策略会挡下写入）。
pub async fn record_usage(
    tx: &DatabaseTransaction,
    input: &UsageInput,
) -> Result<Uuid, sea_orm::DbErr> {
    let id = Uuid::new_v4();
    gateway_usage::ActiveModel {
        id: Set(id),
        tenant_id: Set(input.tenant_id),
        user_id: Set(input.user_id),
        provider_id: Set(input.provider_id),
        model_id: Set(input.model_id),
        prompt_tokens: Set(input.prompt_tokens),
        completion_tokens: Set(input.completion_tokens),
        total_tokens: Set(input.total_tokens),
        status: Set(input.status.clone()),
        latency_ms: Set(input.latency_ms),
        created_at: Set(Utc::now().fixed_offset()),
    }
    .insert(tx)
    .await?;
    Ok(id)
}

/// 落一行审计；事务由调用方提供（必须是租户或账号作用域）。
pub async fn record_audit(
    tx: &DatabaseTransaction,
    tenant_id: Option<Uuid>,
    actor: Uuid,
    action: &str,
    resource: &str,
    detail: Option<Value>,
    ip: Option<String>,
) -> Result<(), sea_orm::DbErr> {
    gateway_audit::ActiveModel {
        id: Set(Uuid::new_v4()),
        tenant_id: Set(tenant_id),
        actor: Set(actor),
        action: Set(action.to_string()),
        resource: Set(resource.to_string()),
        detail: Set(detail),
        ip: Set(ip),
        created_at: Set(Utc::now().fixed_offset()),
    }
    .insert(tx)
    .await?;
    Ok(())
}

/// 用量事件索引（幂等：以 usage 行 id 为 ES 文档 id）。
pub async fn index_usage(es: &EsClient, index: &str, input: &UsageInput) -> Result<()> {
    let id = Uuid::new_v4();
    let response = es
        .client()
        .index(IndexParts::IndexId(index, &id.to_string()))
        .body(json!({
            "tenantID": input.tenant_id.map(|t| t.to_string()),
            "userID": input.user_id.to_string(),
            "providerID": input.provider_id.to_string(),
            "modelID": input.model_id.to_string(),
            "promptTokens": input.prompt_tokens,
            "completionTokens": input.completion_tokens,
            "totalTokens": input.total_tokens,
            "status": input.status,
            "latencyMs": input.latency_ms,
            "createdAt": Utc::now().to_rfc3339(),
        }))
        .send()
        .await
        .context("elasticsearch index usage failed")?;

    if !response.status_code().is_success() {
        let status = response.status_code().as_u16();
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!("elasticsearch index usage status {status}: {body}");
    }
    Ok(())
}

pub async fn ensure_usage_index(es: &EsClient, index: &str) -> Result<()> {
    use elasticsearch::indices::{IndicesCreateParts, IndicesExistsParts};

    let exists = es
        .client()
        .indices()
        .exists(IndicesExistsParts::Index(&[index]))
        .send()
        .await
        .context("elasticsearch index exists failed")?;

    if exists.status_code().is_success() {
        return Ok(());
    }

    let response = es
        .client()
        .indices()
        .create(IndicesCreateParts::Index(index))
        .body(json!({
            "mappings": {
                "properties": {
                    "tenantID": { "type": "keyword" },
                    "userID": { "type": "keyword" },
                    "providerID": { "type": "keyword" },
                    "modelID": { "type": "keyword" },
                    "totalTokens": { "type": "long" },
                    "status": { "type": "keyword" },
                    "createdAt": { "type": "date" }
                }
            }
        }))
        .send()
        .await
        .context("elasticsearch create index failed")?;

    if !response.status_code().is_success() && response.status_code().as_u16() != 400 {
        let status = response.status_code().as_u16();
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!("elasticsearch create index status {status}: {body}");
    }
    Ok(())
}
