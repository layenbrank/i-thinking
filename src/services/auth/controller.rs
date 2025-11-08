use crate::configures::configure::Configure;
use crate::databases::database::Storage;
use crate::services::auth::schema::{SigninRequest, SignupRequest};
use crate::services::auth::service::AuthService;
use crate::utils::response::{ApiErrorResponse, ApiResponse};
use actix_web::web;
use actix_web::HttpResponse;
use actix_web::Result;
use std::sync::Arc;

pub struct AuthController;

impl AuthController {
    /// 用户登录
    pub async fn signin(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        req: web::Json<SigninRequest>,
    ) -> Result<HttpResponse> {
        match AuthService::signin(&db, req.into_inner(), &config).await {
            Ok(response) => ApiResponse::success(response, "登录成功").transform(),
            Err(err) => ApiErrorResponse::from(err).transform(),
        }
    }

    /// 用户注册
    pub async fn signup(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        req: web::Json<SignupRequest>,
    ) -> Result<HttpResponse> {
        match AuthService::signup(&db, req.into_inner(), &config).await {
            Ok(response) => ApiResponse::success(response, "注册成功").transform(),
            Err(err) => ApiErrorResponse::from(err).transform(),
        }
    }
}
