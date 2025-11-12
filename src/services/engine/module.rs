use crate::services::engine::controller::EngineController;
use actix_web::web;

pub struct EngineModule;

// pt: 'page.home',
// qry: value,
// cp: value.length,
// csr: '1',
// pths: '1',
// cvid: cvid

impl EngineModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/engine").route("/suggestion", web::get().to(EngineController::find)),
        );
    }
}
