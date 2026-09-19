//! 日窗 token 配额计数器（Redis）。

use chrono::{Duration, Utc};
use fred::interfaces::KeysInterface;
use uuid::Uuid;

use crate::clients::redis::RedisPool;

#[derive(Debug, thiserror::Error)]
pub enum QuotaError {
    #[error("cache error: {0}")]
    Cache(String),
}

/// 当前 UTC 日期（`YYYY-MM-DD`），用于配额键的日窗。
fn today() -> String {
    Utc::now().format("%Y-%m-%d").to_string()
}

/// 配额键：`gateway:quota:{scope}:{id}:{yyyy-mm-dd}`。
pub fn quota_key(scope: &str, id: &Uuid) -> String {
    format!("gateway:quota:{scope}:{id}:{}", today())
}

/// 距下一个 UTC 午夜的秒数（键过期时间）。
fn ttl_until_midnight() -> i64 {
    let now = Utc::now();
    let next = (now.date_naive() + Duration::days(1))
        .and_hms_opt(0, 0, 0)
        .expect("midnight is valid")
        .and_utc();
    (next - now).num_seconds().max(1)
}

/// 是否已触顶（当前累计 >= 限额）。
pub async fn exhausted(redis: &RedisPool, key: &str, limit: i64) -> Result<bool, QuotaError> {
    let current: Option<i64> = redis
        .pool()
        .get(key)
        .await
        .map_err(|e| QuotaError::Cache(e.to_string()))?;
    Ok(current.unwrap_or(0) >= limit)
}

/// 累计 token 并设置日末过期。
pub async fn add_tokens(
    redis: &RedisPool,
    key: &str,
    tokens: i64,
) -> Result<(), QuotaError> {
    if tokens <= 0 {
        return Ok(());
    }
    let _: i64 = redis
        .pool()
        .incr_by(key, tokens)
        .await
        .map_err(|e| QuotaError::Cache(e.to_string()))?;
    let _: () = redis
        .pool()
        .expire(key, ttl_until_midnight(), None)
        .await
        .map_err(|e| QuotaError::Cache(e.to_string()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_scopes_differ() {
        let id = Uuid::new_v4();
        assert_ne!(quota_key("user", &id), quota_key("tenant", &id));
        assert!(quota_key("user", &id).contains("user"));
    }

    #[test]
    fn ttl_is_positive() {
        assert!(ttl_until_midnight() > 0);
    }
}
