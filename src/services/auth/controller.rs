use crate::databases::database::Storage;
use crate::services::auth::schema::{SigninRequest, SignupRequest};
use crate::services::auth::service::AuthService;
use actix_web::web;
use actix_web::{HttpRequest, HttpResponse, Result};
use std::sync::Arc;

pub struct AuthController;

impl AuthController {
    pub async fn signin(
        db: web::Data<Arc<Storage>>,
        req: web::Json<SigninRequest>,
    ) -> Result<HttpResponse> {
        let user = AuthService::singin(&db, req.into_inner()).await;

        Ok(HttpResponse::Ok().json(user))
    }

    pub async fn singup(
        db: web::Data<Arc<Storage>>,
        req: web::Json<SignupRequest>,
    ) -> Result<HttpResponse> {
        let user = AuthService::singup(&db, req.into_inner()).await;
        Ok(HttpResponse::Ok().json(user))
    }
}
