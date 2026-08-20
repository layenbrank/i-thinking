use crate::middlewares::jwt::JwtAuth;
use crate::services::search::controller::SearchController;
use actix_web::web;

pub struct SearchModule;

impl SearchModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/search")
                .wrap(JwtAuth::required())
                .route("/docs", web::post().to(SearchController::toWrite))
                .route("/docs", web::get().to(SearchController::toRead)),
        );
    }
}
