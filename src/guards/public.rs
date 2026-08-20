//! 公开路径策略（历史：匿名文件下载已移除；保留模块便于扩展白名单）

use actix_web::dev::ServiceRequest;
use actix_web::http::Method;

/// 当前无公开业务路径（文件下载已改为需 JWT）。
pub fn allows(_method: &Method, _path: &str) -> bool {
    false
}

/// 是否放行当前请求（始终 false）。
pub fn file(req: &ServiceRequest) -> bool {
    allows(req.method(), req.path())
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::http::Method;

    #[test]
    fn no_public_file_bypass() {
        assert!(!allows(&Method::GET, "/api/v1/upload/files/abc"));
        assert!(!allows(&Method::GET, "/api/v1/auth/signin"));
    }
}
