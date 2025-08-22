use crate::services::upload::controller::UploadController;
use actix_web::web;

pub struct UploadModule;

impl UploadModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/upload")
                .route("/prepare", web::post().to(UploadController::prepare))
                .route("/chunk", web::post().to(UploadController::chunk))
                .route("/finalize", web::post().to(UploadController::finalize))
                .route(
                    "/progress/{upload_id}",
                    web::get().to(UploadController::progress),
                )
                .route(
                    "/cancel/{upload_id}",
                    web::delete().to(UploadController::cancel),
                )
                .route(
                    "/files/{file_hash}",
                    web::get().to(UploadController::serve_file),
                ),
        );
    }
}
