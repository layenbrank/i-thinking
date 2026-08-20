use crate::clients::redis::RedisPool;
use crate::configures::configure::Configure;
use crate::utils::jwt::{JwtError, verify_token};
use crate::utils::response::{ErrorBody, auth as auth_codes, external};
use actix_web::body::EitherBody;
use actix_web::http::{Method, header};
use actix_web::{
    Error, HttpMessage, HttpResponse,
    dev::{ServiceRequest, ServiceResponse, Transform},
    web,
};
use futures::future::{LocalBoxFuture, Ready, ok};
use std::rc::Rc;
use std::sync::Arc;
use std::task::{Context, Poll};

/// JWT 鉴权。`upload` 变体放行 GET `/upload/files/*`，以便 file_url 可直接下载。
#[derive(Clone, Copy)]
pub struct JwtAuth {
    allow_public_files: bool,
}

impl JwtAuth {
    pub fn required() -> Self {
        Self {
            allow_public_files: false,
        }
    }

    pub fn upload() -> Self {
        Self {
            allow_public_files: true,
        }
    }
}

impl<S, B> Transform<S, ServiceRequest> for JwtAuth
where
    S: actix_web::dev::Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Transform = JwtAuthMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(JwtAuthMiddleware {
            service: Rc::new(service),
            allow_public_files: self.allow_public_files,
        })
    }
}

pub struct JwtAuthMiddleware<S> {
    service: Rc<S>,
    allow_public_files: bool,
}

impl<S, B> actix_web::dev::Service<ServiceRequest> for JwtAuthMiddleware<S>
where
    S: actix_web::dev::Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
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

        if self.allow_public_files && is_public_file(&req) {
            return Box::pin(async move { Ok(service.call(req).await?.map_into_left_body()) });
        }

        let secret = match req.app_data::<web::Data<Arc<Configure>>>() {
            Some(cfg) => cfg.jwt_secret.clone(),
            None => {
                return Box::pin(async move {
                    Ok(json_error(
                        req,
                        ErrorBody::internal_error("服务配置缺失"),
                    ))
                });
            }
        };

        let redis = req.app_data::<web::Data<Arc<RedisPool>>>().cloned();

        let token = match bearer_token(&req) {
            Some(token) => token,
            None => {
                return Box::pin(async move {
                    Ok(json_error(
                        req,
                        ErrorBody::unauthorized("用户未登录"),
                    ))
                });
            }
        };

        let claims = match verify_token(&token, &secret) {
            Ok(claims) => claims,
            Err(JwtError::DecodingError(_)) => {
                return Box::pin(async move {
                    Ok(json_error(
                        req,
                        ErrorBody::custom(auth_codes::INVALID_CREDENTIALS, "登录凭证无效"),
                    ))
                });
            }
            Err(JwtError::InvalidToken) => {
                return Box::pin(async move {
                    Ok(json_error(
                        req,
                        ErrorBody::custom(auth_codes::TOKEN_EXPIRED, "登录凭证过期"),
                    ))
                });
            }
            Err(_) => {
                return Box::pin(async move {
                    Ok(json_error(
                        req,
                        ErrorBody::unauthorized("登录凭证无效"),
                    ))
                });
            }
        };

        Box::pin(async move {
            if let Some(redis) = redis.as_ref() {
                match redis.is_blacklisted(&token).await {
                    Ok(true) => {
                        return Ok(json_error(
                            req,
                            ErrorBody::custom(auth_codes::INVALID_CREDENTIALS, "登录凭证已失效"),
                        ));
                    }
                    Ok(false) => {}
                    Err(_) => {
                        return Ok(json_error(
                            req,
                            ErrorBody::custom(external::CACHE_ERROR, "缓存服务异常"),
                        ));
                    }
                }
            }

            req.extensions_mut().insert(claims);
            Ok(service.call(req).await?.map_into_left_body())
        })
    }
}

fn is_public_file(req: &ServiceRequest) -> bool {
    req.method() == Method::GET && req.path().contains("/upload/files/")
}

fn bearer_token(req: &ServiceRequest) -> Option<String> {
    let value = req.headers().get(header::AUTHORIZATION)?.to_str().ok()?;
    if value.len() > 7 && value[..7].eq_ignore_ascii_case("bearer ") {
        let token = value[7..].trim();
        if token.is_empty() {
            None
        } else {
            Some(token.to_string())
        }
    } else {
        None
    }
}

fn json_error<B>(req: ServiceRequest, body: ErrorBody) -> ServiceResponse<EitherBody<B>> {
    let (http_req, _) = req.into_parts();
    ServiceResponse::new(http_req, HttpResponse::Ok().json(body)).map_into_right_body()
}
