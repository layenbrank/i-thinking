use crate::services::{upload::module::UploadModule, user::module::UserModule};
use actix_web::web;

pub struct AppModule;

impl AppModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/api/v1")
                .configure(UserModule::configure)
                .configure(UploadModule::configure),
        );
    }
}
