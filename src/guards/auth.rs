//! 鉴权守卫（Nest Guard 角色）：决定请求能否进入受保护 Handler。
//!
//! 通过模块 `configure` 上的 `.wrap(Auth::…)` 挂载，而非全局中间件。

use std::rc::Rc;
use std::sync::Arc;
use std::task::{Context, Poll};

use actix_web::body::EitherBody;
use actix_web::{
    Error, HttpMessage, HttpResponse,
    dev::{ServiceRequest, ServiceResponse, Transform},
    web,
};
use futures::future::{LocalBoxFuture, Ready, ok};

use crate::clients::redis::RedisPool;
use crate::configures::configure::Configure;
use crate::filters::exception::Exception;
use crate::guards::blacklist;
use crate::guards::permission::Role;
use crate::utils::code::{auth as auth_codes, external};
use crate::utils::jwt::{JwtError, verify_token};
use crate::utils::token::bearer;

/// 鉴权守卫。
#[derive(Clone, Copy)]
pub struct Auth {
    /// 是否要求 ADMIN 角色
    admin_only: bool,
}

impl Auth {
    /// 任意有效 JWT（非黑名单）
    pub fn isRequired() -> Self {
        Self { admin_only: false }
    }

    /// 仅 ADMIN
    pub fn admin() -> Self {
        Self { admin_only: true }
    }
}

impl<S, B> Transform<S, ServiceRequest> for Auth
where
    S: actix_web::dev::Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>
        + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Transform = AuthMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(AuthMiddleware {
            service: Rc::new(service),
            admin_only: self.admin_only,
        })
    }
}

pub struct AuthMiddleware<S> {
    service: Rc<S>,
    admin_only: bool,
}

impl<S, B> actix_web::dev::Service<ServiceRequest> for AuthMiddleware<S>
where
    S: actix_web::dev::Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>
        + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = Rc::clone(&self.service);
        let admin_only = self.admin_only;

        let secret = match req.app_data::<web::Data<Arc<Configure>>>() {
            Some(cfg) => cfg.jwt_secret.clone(),
            None => {
                return Box::pin(async move {
                    Ok(json_error(req, Exception::internal_error("服务配置缺失")))
                });
            }
        };

        let token = match bearer(req.headers()) {
            Some(token) => token,
            None => {
                return Box::pin(async move {
                    Ok(json_error(req, Exception::unauthorized("用户未登录")))
                });
            }
        };

        let claims = match verify_token(&token, &secret) {
            Ok(claims) => claims,
            Err(err) => {
                return Box::pin(async move { Ok(json_error(req, jwt_exception(err))) });
            }
        };

        if admin_only && !claims.role().is_admin() {
            return Box::pin(async move {
                Ok(json_error(
                    req,
                    Exception::custom(auth_codes::INSUFFICIENT_PERMISSIONS, "权限不足"),
                ))
            });
        }

        let redis = match req.app_data::<web::Data<Arc<RedisPool>>>().cloned() {
            Some(redis) => redis,
            None => {
                return Box::pin(async move {
                    Ok(json_error(
                        req,
                        Exception::custom(external::CACHE_ERROR, "缓存服务未配置"),
                    ))
                });
            }
        };

        Box::pin(async move {
            match blacklist::has(redis.as_ref(), &token).await {
                Ok(true) => {
                    return Ok(json_error(
                        req,
                        Exception::custom(auth_codes::INVALID_CREDENTIALS, "登录凭证已失效"),
                    ));
                }
                Ok(false) => {}
                Err(_) => {
                    return Ok(json_error(
                        req,
                        Exception::custom(external::CACHE_ERROR, "缓存服务异常"),
                    ));
                }
            }

            req.extensions_mut().insert(claims);
            Ok(service.call(req).await?.map_into_left_body())
        })
    }
}

fn json_error<B>(req: ServiceRequest, body: Exception) -> ServiceResponse<EitherBody<B>> {
    let (http_req, _) = req.into_parts();
    ServiceResponse::new(http_req, HttpResponse::Ok().json(body)).map_into_right_body()
}

/// JWT 校验失败 → 业务错误信封（可单测）。
pub fn jwt_exception(err: JwtError) -> Exception {
    match err {
        JwtError::InvalidToken => Exception::custom(auth_codes::TOKEN_EXPIRED, "登录凭证过期"),
        JwtError::DecodingError(_) | JwtError::EncodingError(_) => {
            Exception::custom(auth_codes::INVALID_CREDENTIALS, "登录凭证无效")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::code::{auth as auth_codes, system};
    use actix_web::test as awtest;
    use actix_web::{App, HttpResponse, web};
    use serde_json::Value;
    use std::sync::Arc;

    fn test_configure() -> Configure {
        Configure {
            host: "127.0.0.1".into(),
            port: 3000,
            database_uri: "postgres://x".into(),
            secret: "secret".into(),
            encryption: crate::configures::configure::Encryption::Argon2,
            jwt_secret: "test-secret-key-at-least-32-characters!".into(),
            aes_key: None,
            redis_url: "redis://127.0.0.1:6379".into(),
            redis_pool_size: 1,
            elasticsearch_url: "http://127.0.0.1:9200".into(),
            elasticsearch_index: "test".into(),
            elasticsearch_api_key: None,
            elasticsearch_username: None,
            elasticsearch_password: None,
            elasticsearch_cloud_id: None,
            elasticsearch_insecure: true,
            cors_origins: vec![],
        }
    }

    #[test]
    fn expired_maps_to_token_expired_code() {
        let body = jwt_exception(JwtError::InvalidToken);
        assert_eq!(body.code, auth_codes::TOKEN_EXPIRED);
        assert_eq!(body.msg, "登录凭证过期");
    }

    #[test]
    fn decode_error_maps_to_invalid_credentials() {
        let body = jwt_exception(JwtError::DecodingError("bad".into()));
        assert_eq!(body.code, auth_codes::INVALID_CREDENTIALS);
    }

    #[test]
    fn admin_flag() {
        assert!(Auth::admin().admin_only);
        assert!(!Auth::isRequired().admin_only);
    }

    #[actix_web::test]
    async fn required_without_config_returns_internal_envelope() {
        let app = awtest::init_service(App::new().wrap(Auth::isRequired()).route(
            "/x",
            web::get().to(|| async { HttpResponse::Ok().body("ok") }),
        ))
        .await;

        let req = awtest::TestRequest::get().uri("/x").to_request();
        let resp = awtest::call_service(&app, req).await;
        assert!(resp.status().is_success());
        let body: Value = awtest::read_body_json(resp).await;
        assert_eq!(body["success"], false);
        assert_eq!(body["code"], system::INTERNAL_ERROR);
        assert_eq!(body["msg"], "服务配置缺失");
    }

    #[actix_web::test]
    async fn required_without_redis_returns_cache_envelope() {
        let cfg = test_configure();
        let token =
            crate::utils::jwt::generate_token("u1", "bob", Role::User, &cfg.jwt_secret, Some(1))
                .unwrap();
        let app = awtest::init_service(
            App::new()
                .app_data(web::Data::new(Arc::new(cfg)))
                .wrap(Auth::isRequired())
                .route(
                    "/x",
                    web::get().to(|| async { HttpResponse::Ok().body("ok") }),
                ),
        )
        .await;

        let req = awtest::TestRequest::get()
            .uri("/x")
            .insert_header(("Authorization", format!("Bearer {token}")))
            .to_request();
        let resp = awtest::call_service(&app, req).await;
        let body: Value = awtest::read_body_json(resp).await;
        assert_eq!(body["success"], false);
        assert_eq!(body["code"], external::CACHE_ERROR);
        assert_eq!(body["msg"], "缓存服务未配置");
    }

    #[actix_web::test]
    async fn files_require_auth_fail_closed() {
        let app = awtest::init_service(App::new().wrap(Auth::isRequired()).route(
            "/api/v1/upload/files/{hash}",
            web::get().to(|| async { HttpResponse::Ok().body("file") }),
        ))
        .await;

        let req = awtest::TestRequest::get()
            .uri("/api/v1/upload/files/abc")
            .to_request();
        let resp = awtest::call_service(&app, req).await;
        let body: Value = awtest::read_body_json(resp).await;
        assert_eq!(body["success"], false);
        assert_ne!(body["msg"], "file");
    }

    #[actix_web::test]
    async fn admin_only_rejects_user_role_token() {
        let cfg = test_configure();
        let token =
            crate::utils::jwt::generate_token("u1", "bob", Role::User, &cfg.jwt_secret, Some(1))
                .unwrap();

        let app = awtest::init_service(
            App::new()
                .app_data(web::Data::new(Arc::new(cfg)))
                .wrap(Auth::admin())
                .route(
                    "/x",
                    web::get().to(|| async { HttpResponse::Ok().body("ok") }),
                ),
        )
        .await;

        let req = awtest::TestRequest::get()
            .uri("/x")
            .insert_header(("Authorization", format!("Bearer {token}")))
            .to_request();
        let resp = awtest::call_service(&app, req).await;
        let body: Value = awtest::read_body_json(resp).await;
        assert_eq!(body["success"], false);
        assert_eq!(body["code"], auth_codes::INSUFFICIENT_PERMISSIONS);
        assert_eq!(body["msg"], "权限不足");
    }
}
