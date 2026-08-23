//! 公开路径策略：无需 JWT 的 Auth 写操作等。

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

/// 是否允许匿名访问（当前用于文件下载等扩展）。
pub fn allows(method: &Method, path: &str) -> bool {
    method == Method::POST && PUBLIC_AUTH_POST.contains(&path)
}

/// 是否放行当前请求。
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
    }
}
