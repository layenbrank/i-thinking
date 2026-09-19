use actix_web::web;

use crate::guards::auth::Auth;
use crate::services::sso::controller::SsoController;

pub struct SsoModule;

impl SsoModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/sso")
                // 后台连接管理（平台 ADMIN）
                .service(
                    web::scope("")
                        .wrap(Auth::admin())
                        .route("/connections", web::get().to(SsoController::connections))
                        .route(
                            "/connections",
                            web::post().to(SsoController::connection_write),
                        )
                        .route(
                            "/connections/{id}",
                            web::put().to(SsoController::connection_update),
                        )
                        .route(
                            "/connections/{id}",
                            web::delete().to(SsoController::connection_remove),
                        ),
                )
                // OIDC 流程（公开）
                .route("/{id}/authorize", web::get().to(SsoController::authorize))
                .route("/{id}/callback", web::get().to(SsoController::callback)),
        );
    }
}
