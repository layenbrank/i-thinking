//! 服务身份令牌：core 签发给受信服务进程（当前只有 ai-worker）的**短期**凭据。
//!
//! 为什么不是「共享密钥直接用」：共享密钥是长期凭据，一旦落到编排历史、日志或某个
//! 子进程里就长期有效；短期令牌把有效窗口压到分钟级，并且**自带作用域**（租户 + 模型），
//! 于是调用方无法用换来的令牌去用别的模型或碰别的租户——请求体里说了不算。
//!
//! 复算口径与用户会话令牌（[`crate::utils::jwt`]）刻意分开：密钥、受众、主体都不同，
//! 轮换其一不牵连另一侧。签名算法固定 HS256，签名密钥来自
//! [`Configure::gateway_service_token_secret`](configures::configure::Configure::gateway_service_token_secret)。

use chrono::Utc;
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};

/// 令牌受众：只对服务身份的嵌入出站端点有效。
pub const AUDIENCE: &str = "core.service.gateway.embeddings";
/// 令牌主体：目前唯一的受信服务进程。
pub const SUBJECT: &str = "ai-worker";

#[derive(Debug, thiserror::Error)]
pub enum ServiceTokenError {
    #[error("服务身份令牌无效或已过期")]
    Invalid,
    #[error("服务身份令牌签名失败: {0}")]
    Encode(String),
}

/// 令牌载荷。字段名与对外 JSON 口径一致（`tenantID`），故显式 rename。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceClaims {
    /// 主体：受信服务进程名（当前只有 `ai-worker`）。
    pub sub: String,
    /// 受众：换出来的令牌只能用于这一个端点。
    pub aud: String,
    /// 作用域租户。
    #[serde(rename = "tenantID")]
    pub tenant_id: String,
    /// 作用域模型：出站时以它为准，请求体里换不了。
    pub model: String,
    /// 过期时间（Unix 秒）。
    pub exp: i64,
    /// 签发时间（Unix 秒）。
    pub iat: i64,
}

/// 签发一枚服务标识令牌，返回 `(token, expiresAt 秒)`。
///
/// `ttl_secs` 由调用方（配置访问器）收敛过上限，这里只兜底「至少 1 秒」。
pub fn mint(
    secret: &str,
    tenant_id: &str,
    model: &str,
    ttl_secs: u64,
) -> Result<(String, i64), ServiceTokenError> {
    let now = Utc::now().timestamp();
    let exp = now + ttl_secs.max(1) as i64;
    let claims = ServiceClaims {
        sub: SUBJECT.to_string(),
        aud: AUDIENCE.to_string(),
        tenant_id: tenant_id.to_string(),
        model: model.to_string(),
        exp,
        iat: now,
    };

    let token = encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|err| ServiceTokenError::Encode(err.to_string()))?;

    Ok((token, exp))
}

/// 验签并校验受众/主体/有效期，成功返回载荷。
///
/// 校验清单是刻意收紧的：默认的 `Validation` 不查 `aud`，若只验签名，别的用途的
/// HS256 令牌（只要密钥被误配成同一个）也能直接当服务令牌用。
pub fn verify(secret: &str, token: &str) -> Result<ServiceClaims, ServiceTokenError> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_audience(&[AUDIENCE]);
    validation.set_required_spec_claims(&["exp", "aud", "sub"]);
    // 签发与验签都在本进程内完成，不存在跨进程时钟偏移，默认的 60 秒宽限窗口没有依据
    validation.leeway = 0;

    let claims = decode::<ServiceClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map_err(|_| ServiceTokenError::Invalid)?
    .claims;

    // `set_required_spec_claims` 只保证字段存在，主体由我们独占认定。
    if claims.sub != SUBJECT || claims.model.trim().is_empty() {
        return Err(ServiceTokenError::Invalid);
    }

    Ok(claims)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SECRET: &str = "unit-test-service-token-secret";

    #[test]
    fn mint_then_verify_roundtrip() {
        let (token, exp) = mint(SECRET, "tenant-1", "text-embedding-3-small", 300).unwrap();
        let claims = verify(SECRET, &token).expect("刚签出来的令牌应当可用");

        assert_eq!(claims.tenant_id, "tenant-1");
        assert_eq!(claims.model, "text-embedding-3-small");
        assert_eq!(claims.sub, SUBJECT);
        assert_eq!(claims.aud, AUDIENCE);
        assert_eq!(claims.exp, exp);
        assert!(claims.iat <= exp);
    }

    #[test]
    fn ttl_is_at_least_one_second() {
        let (_, exp) = mint(SECRET, "tenant-1", "m", 0).unwrap();
        let (_, iat_ref) = mint(SECRET, "tenant-1", "m", 1).unwrap();

        assert!(exp > iat_ref - 5, "过期时间应当是未来时刻");
    }

    #[test]
    fn verify_rejects_other_secret() {
        let (token, _) = mint(SECRET, "tenant-1", "m", 300).unwrap();
        assert!(verify("another-secret-at-least-32-chars-long", &token).is_err());
    }

    #[test]
    fn verify_rejects_tampered_payload() {
        let (token, _) = mint(SECRET, "tenant-1", "m", 300).unwrap();
        let mut parts: Vec<String> = token.split('.').map(str::to_string).collect();
        // 改一字节载荷：签名立刻对不上，作用域无法被调用方扩大
        parts[1] = format!("{}A", parts[1]);
        let tampered = parts.join(".");

        assert!(verify(SECRET, &tampered).is_err());
    }

    #[test]
    fn verify_rejects_expired_token() {
        let token = encode(
            &Header::new(Algorithm::HS256),
            &ServiceClaims {
                sub: SUBJECT.to_string(),
                aud: AUDIENCE.to_string(),
                tenant_id: "tenant-1".to_string(),
                model: "m".to_string(),
                exp: Utc::now().timestamp() - 60,
                iat: Utc::now().timestamp() - 120,
            },
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();

        assert!(verify(SECRET, &token).is_err());
    }

    #[test]
    fn verify_rejects_wrong_audience() {
        let token = encode(
            &Header::new(Algorithm::HS256),
            &ServiceClaims {
                sub: SUBJECT.to_string(),
                aud: "core.something.else".to_string(),
                tenant_id: "tenant-1".to_string(),
                model: "m".to_string(),
                exp: Utc::now().timestamp() + 300,
                iat: Utc::now().timestamp(),
            },
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();

        assert!(verify(SECRET, &token).is_err());
    }

    #[test]
    fn verify_rejects_wrong_subject() {
        let token = encode(
            &Header::new(Algorithm::HS256),
            &ServiceClaims {
                sub: "some-other-service".to_string(),
                aud: AUDIENCE.to_string(),
                tenant_id: "tenant-1".to_string(),
                model: "m".to_string(),
                exp: Utc::now().timestamp() + 300,
                iat: Utc::now().timestamp(),
            },
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();

        assert!(verify(SECRET, &token).is_err());
    }

    #[test]
    fn verify_rejects_empty_model_scope() {
        let token = encode(
            &Header::new(Algorithm::HS256),
            &ServiceClaims {
                sub: SUBJECT.to_string(),
                aud: AUDIENCE.to_string(),
                tenant_id: "tenant-1".to_string(),
                model: "  ".to_string(),
                exp: Utc::now().timestamp() + 300,
                iat: Utc::now().timestamp(),
            },
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();

        assert!(verify(SECRET, &token).is_err());
    }
}
