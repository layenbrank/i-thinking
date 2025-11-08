use crate::services::auth::controller::AuthController;
use actix_web::web;

pub struct AuthModule;

impl AuthModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/auth")
                .route("/signin", web::post().to(AuthController::signin))
                .route("/signup", web::post().to(AuthController::signup)),
        );
    }
}
