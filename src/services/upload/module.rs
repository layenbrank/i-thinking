use crate::middlewares::jwt::JwtAuth;
use crate::services::upload::controller::UploadController;
use actix_web::web;

pub struct UploadModule;

impl UploadModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/upload")
                .wrap(JwtAuth::upload())
                .route("/prepare", web::post().to(UploadController::prepare))
                .route("/chunk", web::post().to(UploadController::chunk))
                .route("/finalize", web::post().to(UploadController::finalize))
                .route("/progress/{id}", web::get().to(UploadController::progress))
                .route("/cancel/{id}", web::delete().to(UploadController::cancel))
                .route("/files/{hash}", web::get().to(UploadController::serve_file)),
        );
    }
}
