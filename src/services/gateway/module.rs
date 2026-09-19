use actix_web::web;

use crate::guards::auth::Auth;
use crate::services::gateway::controller::GatewayController;

pub struct GatewayModule;

impl GatewayModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/gateway")
                // 用户面：模型转发 + 可用模型列表
                .service(
                    web::scope("")
                        .wrap(Auth::isRequired())
                        .route(
                            "/chat/completions",
                            web::post().to(GatewayController::chat),
                        )
                        .route("/models", web::get().to(GatewayController::models)),
                )
                // 后台：供应商/模型/用量/审计（平台 ADMIN）
                .service(
                    web::scope("")
                        .wrap(Auth::admin())
                        .route("/providers", web::get().to(GatewayController::providers))
                        .route(
                            "/providers",
                            web::post().to(GatewayController::provider_write),
                        )
                        .route(
                            "/providers/{id}",
                            web::put().to(GatewayController::provider_update),
                        )
                        .route(
                            "/providers/{id}",
                            web::delete().to(GatewayController::provider_remove),
                        )
                        .route(
                            "/admin/models",
                            web::get().to(GatewayController::models_admin),
                        )
                        .route(
                            "/admin/models",
                            web::post().to(GatewayController::model_write),
                        )
                        .route(
                            "/admin/models/{id}",
                            web::put().to(GatewayController::model_update),
                        )
                        .route(
                            "/admin/models/{id}",
                            web::delete().to(GatewayController::model_remove),
                        )
                        .route("/usage", web::get().to(GatewayController::usage))
                        .route("/audit", web::get().to(GatewayController::audit)),
                ),
        );
    }
}
