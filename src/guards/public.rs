//! 公开路径策略：无需 JWT 即可进入 Handler（可选携带 JWT）。
//!
//! 由 [`crate::guards::auth::Auth`] 在校验前调用；未列入此处的路径仍强制登录。

use actix_web::dev::ServiceRequest;
use actix_web::http::Method;

const PUBLIC_AUTH_POST: &[&str] = &[
    "/api/v1/auth/captcha",
    "/api/v1/auth/otp",
    "/api/v1/auth/signin",
    "/api/v1/auth/signup",
    "/api/v1/auth/signin/phone",
    "/api/v1/auth/signin/email",
    "/api/v1/auth/password/forgot",
    "/api/v1/auth/password/reset",
];

const PUBLIC_ASSET_PREFIX: &str = "/api/v1/upload/asset/";

/// 是否允许匿名访问。
pub fn allows(method: &Method, path: &str) -> bool {
    if *method == Method::POST && PUBLIC_AUTH_POST.contains(&path) {
        return true;
    }
    // 按资产 id 下载：可见性在 Handler 内再判（PUBLIC 可匿名）
    if *method == Method::GET && path.starts_with(PUBLIC_ASSET_PREFIX) {
        return true;
    }
    false
}

/// 是否放行当前请求（匿名或可选 JWT）。
pub fn file(req: &ServiceRequest) -> bool {
    allows(req.method(), req.path())
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::http::Method;

    #[test]
    fn auth_post_routes_public() {
        assert!(allows(&Method::POST, "/api/v1/auth/captcha"));
        assert!(allows(&Method::POST, "/api/v1/auth/signin/phone"));
        assert!(allows(&Method::POST, "/api/v1/auth/password/forgot"));
        assert!(!allows(&Method::PUT, "/api/v1/auth/password"));
        assert!(!allows(&Method::GET, "/api/v1/upload/files/abc"));
        assert!(!allows(&Method::GET, "/api/v1/upload/files"));
    }

    #[test]
    fn asset_get_is_public_prefix() {
        assert!(allows(
            &Method::GET,
            "/api/v1/upload/asset/550e8400-e29b-41d4-a716-446655440000"
        ));
        assert!(!allows(&Method::POST, "/api/v1/upload/asset/x"));
        assert!(!allows(&Method::GET, "/api/v1/upload/assets/x"));
    }
}
