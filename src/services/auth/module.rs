use actix_web::web;

use crate::guards::auth::Auth;
use crate::services::auth::controller::AuthController;

pub struct AuthModule;

impl AuthModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/auth")
                .route("/signin", web::post().to(AuthController::signin))
                .route("/signup", web::post().to(AuthController::signup))
                .service(
                    web::scope("")
                        .wrap(Auth::isRequired())
                        .route("/profile", web::get().to(AuthController::toRead))
                        .route("/profile", web::put().to(AuthController::toUpdate))
                        .route("/signout", web::post().to(AuthController::signout)),
                ),
        );
    }
}
