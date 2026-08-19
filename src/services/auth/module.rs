use crate::middlewares::jwt::JwtAuth;
use crate::services::auth::controller::AuthController;
use actix_web::web;

pub struct AuthModule;

impl AuthModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/auth")
                .route("/signin", web::post().to(AuthController::signin))
                .route("/signup", web::post().to(AuthController::signup))
                .service(
                    web::scope("")
                        .wrap(JwtAuth::required())
                        .route("/profile", web::get().to(AuthController::toRead))
                        .route("/profile", web::put().to(AuthController::toUpdate)),
                ),
        );
    }
}
