use actix_web::web;

use crate::guards::auth::Auth;
use crate::services::gateway::controller::GatewayController;

pub struct GatewayModule;

impl GatewayModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/gateway")
                // 用户面：模型转发 + 可用模型列表 + 自助配额/档位（登录即可）
                .wrap(Auth::isRequired())
                .route("/chat/completions", web::post().to(GatewayController::chat))
                .route("/models", web::get().to(GatewayController::models))
                .route("/quota/me", web::get().to(GatewayController::quota_me))
                .route("/plans", web::get().to(GatewayController::plans))
                // 后台：供应商/模型/用量/审计（平台 ADMIN）
                .configure(admin_routes),
        );
    }
}

/// 管理面路由：在上一层「登录校验」之外再要求平台 ADMIN 角色。
///
/// 逐条按 `web::resource` 注册，而不是再套一层 `web::scope("")`：同一层级出现两个
/// 空前缀 scope 时，actix 的 `ResourceMap` 只在第一个匹配节点内继续查找，后注册的
/// scope 永远不会被命中（管理面接口曾因此全部 404）。
fn admin_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/providers")
            .wrap(Auth::admin())
            .route(web::get().to(GatewayController::providers))
            .route(web::post().to(GatewayController::provider_write)),
    )
    .service(
        web::resource("/providers/{id}")
            .wrap(Auth::admin())
            .route(web::put().to(GatewayController::provider_update))
            .route(web::delete().to(GatewayController::provider_remove)),
    )
    .service(
        web::resource("/admin/models")
            .wrap(Auth::admin())
            .route(web::get().to(GatewayController::models_admin))
            .route(web::post().to(GatewayController::model_write)),
    )
    .service(
        web::resource("/admin/models/{id}")
            .wrap(Auth::admin())
            .route(web::put().to(GatewayController::model_update))
            .route(web::delete().to(GatewayController::model_remove)),
    )
    .service(
        web::resource("/usage")
            .wrap(Auth::admin())
            .route(web::get().to(GatewayController::usage)),
    )
    .service(
        web::resource("/audit")
            .wrap(Auth::admin())
            .route(web::get().to(GatewayController::audit)),
    );
}
