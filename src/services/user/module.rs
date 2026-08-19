use crate::middlewares::jwt::JwtAuth;
use crate::services::user::controller::UserController;
use actix_web::web;

pub struct UserModule;

impl UserModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/users")
                .wrap(JwtAuth::required())
                .route("", web::get().to(UserController::find_all))
                .route("", web::post().to(UserController::insert))
                .route("/{id}", web::get().to(UserController::find_one))
                .route("/{id}", web::put().to(UserController::update))
                .route("/{id}", web::delete().to(UserController::remove)),
        );
    }
}
