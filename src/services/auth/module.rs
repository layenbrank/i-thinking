use crate::services::auth::controller::AuthController;
use actix_web::web;

pub struct AuthModule;

impl AuthModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/auth")
                .route("/signin", web::post().to(AuthController::signin))
                .route("/singup", web::post().to(AuthController::singup)),
        );
    }
}
