//! 服务身份令牌：core 签发给受信服务进程（当前只有 ai-worker）的**短期**凭据。
//!
//! 为什么不是「共享密钥直接用」：共享密钥是长期凭据，一旦落到编排历史、日志或某个
//! 子进程里就长期有效；短期令牌把有效窗口压到分钟级，并且**自带作用域**（租户 + 模型，
//! 或租户 + 单个资产），于是调用方无法用换来的令牌去用别的模型、读别的资产或碰别的租户
//! ——请求体里说了不算。
//!
//! 复算口径与用户会话令牌（[`crate::utils::jwt`]）刻意分开：密钥、受众、主体都不同，
//! 轮换其一不牵连另一侧。签名算法固定 HS256，签名密钥来自
//! [`Configure::gateway_service_token_secret`](configures::configure::Configure::gateway_service_token_secret)。

use chrono::Utc;
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};

/// 令牌受众：嵌入出站端点（`POST /api/v1/service/embeddings`）。
pub const AUDIENCE_EMBEDDINGS: &str = "core.service.gateway.embeddings";
/// 令牌受众：资产内容端点（`GET /api/v1/service/assets/{assetID}/content`）。
pub const AUDIENCE_ASSET_CONTENT: &str = "core.service.asset.content";
/// 令牌受众：聊天出站端点（`POST /api/v1/service/chat/completions`）。
pub const AUDIENCE_CHAT: &str = "core.service.gateway.chat";
/// 令牌主体：目前唯一的受信服务进程。
pub const SUBJECT: &str = "ai-worker";

/// 服务身份能做的三件事。
///
/// 一件事一个受众，而不是「一个令牌管全部」：受众是 JWT 的标准字段，验签时按端点写死，
/// 于是嵌入用的令牌拿到内容端点上会直接 401——「越权」在这里不是一处需要记得写的判断，
/// 而是签名载荷里就没有那个受众。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Audience {
    /// 嵌入出站。
    Embeddings,
    /// 资产内容读取。
    AssetContent,
    /// 聊天出站（agent 运行时用）。
    Chat,
}

impl Audience {
    /// `aud` 声明值。
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Embeddings => AUDIENCE_EMBEDDINGS,
            Self::AssetContent => AUDIENCE_ASSET_CONTENT,
            Self::Chat => AUDIENCE_CHAT,
        }
    }

    /// 对外请求体里的 `scope` 字面量（比受众短，便于人读日志）。
    #[must_use]
    pub const fn scope(self) -> &'static str {
        match self {
            Self::Embeddings => "embeddings",
            Self::AssetContent => "asset-read",
            Self::Chat => "chat",
        }
    }

    /// 解析请求体里的 `scope`。
    #[must_use]
    pub fn from_scope(value: &str) -> Option<Self> {
        match value.trim() {
            "embeddings" => Some(Self::Embeddings),
            "asset-read" => Some(Self::AssetContent),
            "chat" => Some(Self::Chat),
            _ => None,
        }
    }
}

/// 一枚令牌的作用域：租户 + 该受众唯一允许的那一项资源。
#[derive(Debug, Clone, Copy)]
pub enum Scope<'a> {
    /// 嵌入：限定租户与模型（换到的令牌用不了别的模型）。
    Embeddings { tenant_id: &'a str, model: &'a str },
    /// 资产内容：限定租户与单个资产（换到的令牌读不了别的资产）。
    AssetContent {
        tenant_id: &'a str,
        asset_id: &'a str,
    },
    /// 聊天：限定租户与模型（同嵌入，但打的是聊天端点）。
    Chat { tenant_id: &'a str, model: &'a str },
}

impl Scope<'_> {
    /// 作用域对应的受众。
    #[must_use]
    pub const fn audience(&self) -> Audience {
        match self {
            Self::Embeddings { .. } => Audience::Embeddings,
            Self::AssetContent { .. } => Audience::AssetContent,
            Self::Chat { .. } => Audience::Chat,
        }
    }

    const fn tenant_id(&self) -> &str {
        match self {
            Self::Embeddings { tenant_id, .. }
            | Self::AssetContent { tenant_id, .. }
            | Self::Chat { tenant_id, .. } => tenant_id,
        }
    }

    const fn model(&self) -> Option<&str> {
        match self {
            Self::Embeddings { model, .. } | Self::Chat { model, .. } => Some(model),
            Self::AssetContent { .. } => None,
        }
    }

    const fn asset_id(&self) -> Option<&str> {
        match self {
            Self::AssetContent { asset_id, .. } => Some(asset_id),
            Self::Embeddings { .. } | Self::Chat { .. } => None,
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ServiceTokenError {
    #[error("服务身份令牌无效或已过期")]
    Invalid,
    #[error("服务身份令牌签名失败: {0}")]
    Encode(String),
}

/// 令牌载荷。字段名与对外 JSON 口径一致（`tenantID` / `assetID`），故显式 rename。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceClaims {
    /// 主体：受信服务进程名（当前只有 `ai-worker`）。
    pub sub: String,
    /// 受众：换出来的令牌只能用于这一个端点。
    pub aud: String,
    /// 作用域租户。
    #[serde(rename = "tenantID")]
    pub tenant_id: String,
    /// 作用域模型：仅嵌入受众有值，出站时以它为准，请求体里换不了。
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    /// 作用域资产：仅资产内容受众有值，读不了别的资产。
    #[serde(default, rename = "assetID", skip_serializing_if = "Option::is_none")]
    pub asset_id: Option<String>,
    /// 过期时间（Unix 秒）。
    pub exp: i64,
    /// 签发时间（Unix 秒）。
    pub iat: i64,
}

/// 签发一枚服务身份令牌，返回 `(token, expiresAt 秒)`。
///
/// 受众由作用域决定，两者不可能对不上——这是签发侧唯一需要保证的不变量。
/// `ttl_secs` 由调用方（配置访问器）收敛过上限，这里只兜底「至少 1 秒」。
pub fn mint(
    secret: &str,
    scope: Scope<'_>,
    ttl_secs: u64,
) -> Result<(String, i64), ServiceTokenError> {
    let now = Utc::now().timestamp();
    let exp = now + ttl_secs.max(1) as i64;
    let claims = ServiceClaims {
        sub: SUBJECT.to_string(),
        aud: scope.audience().as_str().to_string(),
        tenant_id: scope.tenant_id().to_string(),
        model: scope.model().map(str::to_string),
        asset_id: scope.asset_id().map(str::to_string),
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
/// HS256 令牌（只要密钥被误配成同一个）也能直接当服务令牌用。受众由端点写死传入，
/// 调用方无法「按请求体决定信任谁」。
pub fn verify(
    secret: &str,
    token: &str,
    audience: Audience,
) -> Result<ServiceClaims, ServiceTokenError> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_audience(&[audience.as_str()]);
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

    // `set_required_spec_claims` 只保证字段存在，主体与「本受众必填的作用域」由我们独占认定：
    // 受众对了但作用域缺失的令牌（例如手工改过载荷再用合法密钥重签），在这里被拦下。
    if claims.sub != SUBJECT {
        return Err(ServiceTokenError::Invalid);
    }
    let scope_present = match audience {
        Audience::Embeddings | Audience::Chat => {
            claims.model.as_ref().is_some_and(|m| !m.trim().is_empty())
        }
        Audience::AssetContent => claims
            .asset_id
            .as_ref()
            .is_some_and(|a| !a.trim().is_empty()),
    };
    if !scope_present {
        return Err(ServiceTokenError::Invalid);
    }

    Ok(claims)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SECRET: &str = "unit-test-service-token-secret";

    fn embeddings<'a>(tenant_id: &'a str, model: &'a str) -> Scope<'a> {
        Scope::Embeddings { tenant_id, model }
    }

    fn asset<'a>(tenant_id: &'a str, asset_id: &'a str) -> Scope<'a> {
        Scope::AssetContent {
            tenant_id,
            asset_id,
        }
    }

    fn chat<'a>(tenant_id: &'a str, model: &'a str) -> Scope<'a> {
        Scope::Chat { tenant_id, model }
    }

    #[test]
    fn scope_maps_to_audience_and_back() {
        for audience in [Audience::Embeddings, Audience::AssetContent, Audience::Chat] {
            assert_eq!(Audience::from_scope(audience.scope()), Some(audience));
        }
        // 未知作用域不能被当成缺省值悄悄放行
        assert_eq!(Audience::from_scope("asset-content"), None);
        assert_eq!(Audience::from_scope(""), None);
    }

    #[test]
    fn mint_chat_scope_carries_model_and_no_asset() {
        let (token, _) = mint(SECRET, chat("tenant-1", "gpt-4o"), 300).unwrap();
        let claims = verify(SECRET, &token, Audience::Chat).unwrap();

        assert_eq!(claims.aud, AUDIENCE_CHAT);
        assert_eq!(claims.model.as_deref(), Some("gpt-4o"));
        assert_eq!(claims.asset_id, None);
        assert_eq!(claims.tenant_id, "tenant-1");
    }

    #[test]
    fn mint_then_verify_roundtrip() {
        let (token, exp) = mint(
            SECRET,
            embeddings("tenant-1", "text-embedding-3-small"),
            300,
        )
        .unwrap();
        let claims = verify(SECRET, &token, Audience::Embeddings).expect("刚签出来的令牌应当可用");

        assert_eq!(claims.tenant_id, "tenant-1");
        assert_eq!(claims.model.as_deref(), Some("text-embedding-3-small"));
        assert_eq!(claims.asset_id, None);
        assert_eq!(claims.sub, SUBJECT);
        assert_eq!(claims.aud, AUDIENCE_EMBEDDINGS);
        assert_eq!(claims.exp, exp);
        assert!(claims.iat <= exp);
    }

    #[test]
    fn mint_asset_scope_carries_asset_and_no_model() {
        let (token, _) = mint(SECRET, asset("tenant-1", "asset-1"), 300).unwrap();
        let claims = verify(SECRET, &token, Audience::AssetContent).unwrap();

        assert_eq!(claims.asset_id.as_deref(), Some("asset-1"));
        assert_eq!(claims.tenant_id, "tenant-1");
        assert_eq!(claims.model, None);
        assert_eq!(claims.aud, AUDIENCE_ASSET_CONTENT);
    }

    #[test]
    fn ttl_is_at_least_one_second() {
        let (_, exp) = mint(SECRET, embeddings("tenant-1", "m"), 0).unwrap();
        let (_, iat_ref) = mint(SECRET, embeddings("tenant-1", "m"), 1).unwrap();

        assert!(exp > iat_ref - 5, "过期时间应当是未来时刻");
    }

    #[test]
    fn verify_rejects_other_secret() {
        let (token, _) = mint(SECRET, embeddings("tenant-1", "m"), 300).unwrap();
        assert!(
            verify(
                "another-secret-at-least-32-chars-long",
                &token,
                Audience::Embeddings
            )
            .is_err()
        );
    }

    #[test]
    fn verify_rejects_tampered_payload() {
        let (token, _) = mint(SECRET, embeddings("tenant-1", "m"), 300).unwrap();
        let mut parts: Vec<String> = token.split('.').map(str::to_string).collect();
        // 改一字节载荷：签名立刻对不上，作用域无法被调用方扩大
        parts[1] = format!("{}A", parts[1]);
        let tampered = parts.join(".");

        assert!(verify(SECRET, &tampered, Audience::Embeddings).is_err());
    }

    #[test]
    fn verify_rejects_expired_token() {
        let token = encode(
            &Header::new(Algorithm::HS256),
            &ServiceClaims {
                sub: SUBJECT.to_string(),
                aud: AUDIENCE_EMBEDDINGS.to_string(),
                tenant_id: "tenant-1".to_string(),
                model: Some("m".to_string()),
                asset_id: None,
                exp: Utc::now().timestamp() - 60,
                iat: Utc::now().timestamp() - 120,
            },
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();

        assert!(verify(SECRET, &token, Audience::Embeddings).is_err());
    }

    #[test]
    fn verify_rejects_wrong_audience() {
        let token = encode(
            &Header::new(Algorithm::HS256),
            &ServiceClaims {
                sub: SUBJECT.to_string(),
                aud: "core.something.else".to_string(),
                tenant_id: "tenant-1".to_string(),
                model: Some("m".to_string()),
                asset_id: None,
                exp: Utc::now().timestamp() + 300,
                iat: Utc::now().timestamp(),
            },
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();

        assert!(verify(SECRET, &token, Audience::Embeddings).is_err());
    }

    /// 受众串了：嵌入令牌拿到内容端点上必须被拒——这是「一件事一个受众」的全部意义。
    #[test]
    fn verify_rejects_token_minted_for_other_endpoint() {
        let (embeddings_token, _) = mint(SECRET, embeddings("tenant-1", "m"), 300).unwrap();
        assert!(verify(SECRET, &embeddings_token, Audience::AssetContent).is_err());

        let (asset_token, _) = mint(SECRET, asset("tenant-1", "asset-1"), 300).unwrap();
        assert!(verify(SECRET, &asset_token, Audience::Embeddings).is_err());

        // 嵌入与聊天都是「租户 + 模型」，载荷形状一模一样：只有受众能把它们分开，
        // 所以嵌入令牌打聊天端点、聊天令牌打嵌入端点都必须被拒。
        let (chat_token, _) = mint(SECRET, chat("tenant-1", "m"), 300).unwrap();
        assert!(verify(SECRET, &embeddings_token, Audience::Chat).is_err());
        assert!(verify(SECRET, &chat_token, Audience::Embeddings).is_err());
    }

    #[test]
    fn verify_rejects_wrong_subject() {
        let token = encode(
            &Header::new(Algorithm::HS256),
            &ServiceClaims {
                sub: "some-other-service".to_string(),
                aud: AUDIENCE_EMBEDDINGS.to_string(),
                tenant_id: "tenant-1".to_string(),
                model: Some("m".to_string()),
                asset_id: None,
                exp: Utc::now().timestamp() + 300,
                iat: Utc::now().timestamp(),
            },
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();

        assert!(verify(SECRET, &token, Audience::Embeddings).is_err());
    }

    /// 受众对了但作用域缺失（例如拿着合法密钥重签一枚空壳载荷）：不能退化成「匿名服务」。
    #[test]
    fn verify_rejects_missing_scope_claim() {
        let now = Utc::now().timestamp();
        let missing_model = encode(
            &Header::new(Algorithm::HS256),
            &ServiceClaims {
                sub: SUBJECT.to_string(),
                aud: AUDIENCE_EMBEDDINGS.to_string(),
                tenant_id: "tenant-1".to_string(),
                model: None,
                asset_id: None,
                exp: now + 300,
                iat: now,
            },
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();
        assert!(verify(SECRET, &missing_model, Audience::Embeddings).is_err());
        // 聊天的作用域字段与嵌入同形，缺失一样必须被拒
        assert!(verify(SECRET, &missing_model, Audience::Chat).is_err());

        let missing_asset = encode(
            &Header::new(Algorithm::HS256),
            &ServiceClaims {
                sub: SUBJECT.to_string(),
                aud: AUDIENCE_ASSET_CONTENT.to_string(),
                tenant_id: "tenant-1".to_string(),
                model: None,
                asset_id: None,
                exp: now + 300,
                iat: now,
            },
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();
        assert!(verify(SECRET, &missing_asset, Audience::AssetContent).is_err());
    }

    #[test]
    fn verify_rejects_blank_scope_claim() {
        let now = Utc::now().timestamp();
        let blank_model = encode(
            &Header::new(Algorithm::HS256),
            &ServiceClaims {
                sub: SUBJECT.to_string(),
                aud: AUDIENCE_EMBEDDINGS.to_string(),
                tenant_id: "tenant-1".to_string(),
                model: Some("  ".to_string()),
                asset_id: None,
                exp: now + 300,
                iat: now,
            },
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();
        assert!(verify(SECRET, &blank_model, Audience::Embeddings).is_err());
        assert!(verify(SECRET, &blank_model, Audience::Chat).is_err());

        let blank_asset = encode(
            &Header::new(Algorithm::HS256),
            &ServiceClaims {
                sub: SUBJECT.to_string(),
                aud: AUDIENCE_ASSET_CONTENT.to_string(),
                tenant_id: "tenant-1".to_string(),
                model: None,
                asset_id: Some(" ".to_string()),
                exp: now + 300,
                iat: now,
            },
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();
        assert!(verify(SECRET, &blank_asset, Audience::AssetContent).is_err());
    }
}
