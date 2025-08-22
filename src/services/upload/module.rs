use crate::services::upload::controller::UploadController;
use actix_web::{HttpResponse, web};

pub struct UploadModule;

impl UploadModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/upload")
                .route("/init", web::post().to(UploadController::upload_controller))
                .route("/test", web::get().to(UploadController::test_controller)) // 添加测试路由
                .route("/chunk", web::post().to(UploadController::upload_chunk))
                .route(
                    "/complete",
                    web::post().to(UploadController::complete_upload),
                )
                .route(
                    "/progress/{upload_id}",
                    web::get().to(UploadController::get_progress),
                )
                .route(
                    "/cancel/{upload_id}",
                    web::delete().to(UploadController::cancel),
                ),
        );
    }
}
