//! 服务身份守卫：让**受信的服务进程**（当前只有 ai-worker）走 core 的出站端点。
//!
//! 与 [`Auth`](crate::guards::auth::Auth) 的区别是「谁在调用」：不是终端用户，而是服务。
//! 两个请求头对应两种信任，彼此不能互相替代：
//!
//! * `X-Internal-Token`（[`InternalCaller`]）：core ↔ ai-worker 的共享密钥，只能换令牌；
//! * `X-Service-Token`（[`ServiceScope`]）：core 签发的短期令牌，**自带作用域**
//!   （租户 + 模型），是出站端点的唯一有效凭据。
//!
//! 实现成 [`FromRequest`] 而不是中间件，是为了让「没验身份就拿不到入参」这件事由类型系统
//! 保证：handler 的形参里出现 `ServiceScope`，就等于声明了该端点只对服务身份开放，
//! 也没有「忘了加守卫」这种可能（中间件写在 scope 上，改一行 wrap 就能漏掉整层）。

use std::future::{Ready, ready};

use actix_web::{FromRequest, HttpRequest, dev::Payload, web};
use identity::{PlatformRole, Principal, TenantContext, TenantId, UserId};

use crate::configures::configure::Configure;
use crate::filters::exception::Exception;
use crate::services::gateway::service_token::{self, ServiceTokenError};
use crate::utils::code::{auth as auth_codes, system};

/// 服务身份令牌请求头。
pub const SERVICE_TOKEN_HEADER: &str = "x-service-token";
/// core ↔ ai-worker 的内部共享令牌请求头。
pub const INTERNAL_TOKEN_HEADER: &str = "x-internal-token";

/// 已验签的服务身份作用域。
///
/// 租户与模型都从令牌里取：调用方在请求体或查询串里说什么都不算数，
/// 于是「换到的令牌只能干这一件事」是结构上的事实，而不是一处需要记得写的判断。
#[derive(Debug, Clone)]
pub struct ServiceScope {
    tenant_id: TenantId,
    model: String,
}

impl ServiceScope {
    /// 作用域租户。
    #[must_use]
    pub const fn tenant_id(&self) -> TenantId {
        self.tenant_id
    }

    /// 作用域模型名。
    #[must_use]
    pub fn model(&self) -> &str {
        &self.model
    }

    /// 该身份在领域层的样子：租户内的一个无成员角色主体。
    ///
    /// 它不是某个账号——服务进程没有账号；用量/审计行按 `tenantID` 归属，
    /// `userID` 记为服务主体（见 [`SERVICE_ACTOR_ID`]）。
    #[must_use]
    pub fn principal(&self) -> Principal {
        Principal::new(UserId::from_uuid(SERVICE_ACTOR_ID), PlatformRole::User)
            .with_tenant(TenantContext::new(self.tenant_id))
    }
}

/// 服务身份在用量/审计行里的 `userID`。
///
/// 服务进程不是账号，但用量行必须有个主体：全零 UUID 是显式的「这是服务调用」，
/// 与任何真实账号都不冲突（`gateway_usage.userID` 没有外键）。
pub const SERVICE_ACTOR_ID: uuid::Uuid = uuid::Uuid::nil();

/// 已确认的内部共享调用方（`X-Internal-Token` 校验通过）。
#[derive(Debug, Clone, Copy)]
pub struct InternalCaller;

impl FromRequest for ServiceScope {
    type Error = Exception;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _payload: &mut Payload) -> Self::Future {
        ready(verify_service(req))
    }
}

impl FromRequest for InternalCaller {
    type Error = Exception;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _payload: &mut Payload) -> Self::Future {
        ready(verify_internal(req))
    }
}

/// 校验服务身份令牌，成功返回作用域。
///
/// # Errors
/// 配置缺失、密钥未启用、请求头缺失/格式错误、签名或有效期不通过。
pub fn verify_service(req: &HttpRequest) -> Result<ServiceScope, Exception> {
    let config = config(req)?;
    let secret = config.gateway_service_token_secret();
    if secret.is_empty() {
        // 没配密钥 = 这个部署不接受服务身份调用，明确拒绝而不是「悄悄放行」。
        return Err(Exception::custom(
            system::SERVICE_UNAVAILABLE,
            "服务身份端点未启用",
        ));
    }

    let raw = header(req, SERVICE_TOKEN_HEADER, "缺少服务身份令牌")?;
    let claims = service_token::verify(secret, raw).map_err(|err| match err {
        ServiceTokenError::Invalid => {
            Exception::custom(auth_codes::INVALID_CREDENTIALS, "服务身份令牌无效或已过期")
        }
        ServiceTokenError::Encode(msg) => {
            tracing::error!(error = %msg, "服务身份令牌校验异常");
            Exception::internal_error("服务身份令牌校验失败")
        }
    })?;

    let tenant_id = claims
        .tenant_id
        .parse::<uuid::Uuid>()
        .map(TenantId::from_uuid)
        .map_err(|_| {
            Exception::custom(auth_codes::INVALID_CREDENTIALS, "服务身份令牌无效或已过期")
        })?;

    Ok(ServiceScope {
        tenant_id,
        model: claims.model,
    })
}

/// 校验内部共享令牌（core ↔ ai-worker 双向信任的那一把）。
///
/// # Errors
/// 配置缺失、未配置内部令牌、请求头缺失或与配置不一致。
pub fn verify_internal(req: &HttpRequest) -> Result<InternalCaller, Exception> {
    let config = config(req)?;
    let expected = config.ai_worker.token.trim();
    if expected.is_empty() {
        return Err(Exception::custom(
            system::SERVICE_UNAVAILABLE,
            "内部调用未配置",
        ));
    }

    let provided = header(req, INTERNAL_TOKEN_HEADER, "缺少内部调用令牌")?;
    if !constant_time_eq(provided.as_bytes(), expected.as_bytes()) {
        return Err(Exception::custom(
            auth_codes::INVALID_CREDENTIALS,
            "内部调用令牌无效",
        ));
    }

    Ok(InternalCaller)
}

fn config(req: &HttpRequest) -> Result<web::Data<std::sync::Arc<Configure>>, Exception> {
    req.app_data::<web::Data<std::sync::Arc<Configure>>>()
        .cloned()
        .ok_or_else(|| Exception::internal_error("服务配置缺失"))
}

fn header<'a>(req: &'a HttpRequest, name: &str, missing: &str) -> Result<&'a str, Exception> {
    req.headers()
        .get(name)
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| Exception::custom(auth_codes::INVALID_CREDENTIALS, missing))
}

/// 恒定时间比较：长度之外不泄露「前几个字符对上了」。
///
/// 共享密钥的比较不能用 `==`（短路比较会随匹配前缀变慢，足以在网络上被统计出来）。
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }

    a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::test::TestRequest;

    fn request(config: Configure) -> HttpRequest {
        TestRequest::default()
            .app_data(web::Data::new(std::sync::Arc::new(config)))
            .to_http_request()
    }

    fn enabled_config() -> Configure {
        let mut config = Configure::default();
        config.gateway.service_token_secret = "unit-test-service-token-secret".to_string();
        config.ai_worker.token = "unit-test-internal-token".to_string();
        config
    }

    #[test]
    fn disabled_endpoint_rejects_before_looking_at_headers() {
        let err = verify_service(&request(Configure::default())).unwrap_err();

        assert_eq!(
            err.status(),
            actix_web::http::StatusCode::SERVICE_UNAVAILABLE
        );
    }

    #[test]
    fn missing_header_is_unauthorized() {
        let err = verify_service(&request(enabled_config())).unwrap_err();

        assert_eq!(err.status(), actix_web::http::StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn invalid_token_is_unauthorized() {
        let req = TestRequest::default()
            .app_data(web::Data::new(std::sync::Arc::new(enabled_config())))
            .insert_header((SERVICE_TOKEN_HEADER, "not-a-jwt"))
            .to_http_request();

        assert_eq!(
            verify_service(&req).unwrap_err().status(),
            actix_web::http::StatusCode::UNAUTHORIZED
        );
    }

    #[test]
    fn valid_token_yields_scope_and_principal() {
        let config = enabled_config();
        let tenant = uuid::Uuid::new_v4();
        let (token, _) = service_token::mint(
            config.gateway_service_token_secret(),
            &tenant.to_string(),
            "text-embedding-3-small",
            60,
        )
        .unwrap();
        let req = TestRequest::default()
            .app_data(web::Data::new(std::sync::Arc::new(config)))
            .insert_header((SERVICE_TOKEN_HEADER, token))
            .to_http_request();

        let scope = verify_service(&req).unwrap();

        assert_eq!(scope.tenant_id().as_uuid(), tenant);
        assert_eq!(scope.model(), "text-embedding-3-small");
        let principal = scope.principal();
        assert_eq!(principal.tenant_id(), Some(scope.tenant_id()));
        assert_eq!(principal.tenant_role(), None, "服务身份不是租户成员");
        assert_eq!(principal.user_id().as_uuid(), SERVICE_ACTOR_ID);
    }

    #[test]
    fn internal_caller_requires_exact_token() {
        let config = enabled_config();

        let missing = request(config.clone());
        assert_eq!(
            verify_internal(&missing).unwrap_err().status(),
            actix_web::http::StatusCode::UNAUTHORIZED
        );

        let wrong = TestRequest::default()
            .app_data(web::Data::new(std::sync::Arc::new(config.clone())))
            .insert_header((INTERNAL_TOKEN_HEADER, "unit-test-internal-tokeN"))
            .to_http_request();
        assert!(verify_internal(&wrong).is_err());

        let ok = TestRequest::default()
            .app_data(web::Data::new(std::sync::Arc::new(config)))
            .insert_header((INTERNAL_TOKEN_HEADER, "unit-test-internal-token"))
            .to_http_request();
        assert!(verify_internal(&ok).is_ok());
    }

    #[test]
    fn internal_caller_reports_missing_configuration() {
        assert_eq!(
            verify_internal(&request(Configure::default()))
                .unwrap_err()
                .status(),
            actix_web::http::StatusCode::SERVICE_UNAVAILABLE
        );
    }

    #[test]
    fn constant_time_compare_matches_equality() {
        assert!(constant_time_eq(b"abc", b"abc"));
        assert!(!constant_time_eq(b"abc", b"abd"));
        assert!(!constant_time_eq(b"abc", b"ab"));
        assert!(!constant_time_eq(b"", b"a"));
        assert!(constant_time_eq(b"", b""));
    }
}
