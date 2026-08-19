use crate::configures::configure::Configure;
use crate::databases::database::Storage;
use crate::services::auth::schema::{SigninP, SignupP, ProfileP};
use crate::services::auth::service::AuthService;
use crate::utils::jwt::Claims;
use crate::utils::response::{ErrorBody, Body};
use actix_web::{HttpMessage, HttpRequest, HttpResponse, Result, web};
use std::sync::Arc;

pub struct AuthController;

impl AuthController {
    /// 用户登录
    pub async fn signin(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        req: web::Json<SigninP>,
    ) -> Result<HttpResponse> {
        match AuthService::signin(&db, req.into_inner(), &config).await {
            Ok(response) => Body::success(response, "登录成功").transform(),
            Err(err) => ErrorBody::from(err).transform(),
        }
    }

    /// 用户注册
    pub async fn signup(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        req: web::Json<SignupP>,
    ) -> Result<HttpResponse> {
        match AuthService::signup(&db, req.into_inner(), &config).await {
            Ok(response) => Body::success(response, "注册成功").transform(),
            Err(err) => ErrorBody::from(err).transform(),
        }
    }

    /// 获取当前用户 profile
    pub async fn toRead(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
    ) -> Result<HttpResponse> {
        let Some(claims) = http.extensions().get::<Claims>().cloned() else {
            return ErrorBody::unauthorized("用户未登录").transform();
        };

        match AuthService::toRead(&db, &claims.sub).await {
            Ok(response) => Body::success(response, "获取个人信息成功").transform(),
            Err(err) => ErrorBody::from(err).transform(),
        }
    }

    /// 更新当前用户 profile
    pub async fn toUpdate(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        req: web::Json<ProfileP>,
    ) -> Result<HttpResponse> {
        let Some(claims) = http.extensions().get::<Claims>().cloned() else {
            return ErrorBody::unauthorized("用户未登录").transform();
        };

        match AuthService::toUpdate(&db, &claims.sub, req.into_inner()).await {
            Ok(response) => Body::success(response, "更新个人信息成功").transform(),
            Err(err) => ErrorBody::from(err).transform(),
        }
    }
}
