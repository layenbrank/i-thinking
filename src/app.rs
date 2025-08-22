use crate::services::{upload::module::UploadModule, user::module::UserModule};
use actix_web::web;

pub struct AppModule;

impl AppModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/api/v1")
                .configure(UserModule::configure)
                .configure(UploadModule::configure),
        )
        .service(
            web::scope("/api/files")
                .route("/{file_hash}", web::get().to(crate::services::upload::controller::UploadController::serve_file))
        );
    }
}
