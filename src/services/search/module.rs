use actix_web::web;

use crate::guards::auth::Auth;
use crate::services::search::controller::SearchController;

pub struct SearchModule;

impl SearchModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/search")
                .wrap(Auth::required())
                .route("/docs", web::post().to(SearchController::toWrite))
                .route("/docs", web::get().to(SearchController::toRead)),
        );
    }
}
