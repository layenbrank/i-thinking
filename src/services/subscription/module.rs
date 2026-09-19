use actix_web::web;

use crate::guards::auth::Auth;
use crate::services::subscription::controller::SubscriptionController;

pub struct SubscriptionModule;

impl SubscriptionModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/tenants/{id}/subscriptions")
                .wrap(Auth::isRequired())
                .route("", web::get().to(SubscriptionController::toList))
                .route("", web::post().to(SubscriptionController::toWrite))
                .route(
                    "/{subscriptionID}",
                    web::delete().to(SubscriptionController::toRemove),
                ),
        );

        // 当前生效配额（免费档 / 订阅档位 / 全局兜底）
        cfg.service(
            web::scope("/tenants/{id}/quota")
                .wrap(Auth::isRequired())
                .route("", web::get().to(SubscriptionController::quota)),
        );
    }
}
