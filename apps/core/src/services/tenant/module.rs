use actix_web::web;

use crate::guards::auth::Auth;
use crate::services::payment::module::PaymentModule;
use crate::services::subscription::module::SubscriptionModule;
use crate::services::tenant::controller::TenantController;

pub struct TenantModule;

impl TenantModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/tenants")
                .wrap(Auth::isRequired())
                // 订阅 / 配额：相对路径资源注册进本 scope（见 SubscriptionModule 注释）
                .configure(SubscriptionModule::configure)
                // 支付订单 / 价格目录：同一套相对路径注册法则
                .configure(PaymentModule::configure_tenant)
                .route("", web::get().to(TenantController::toList))
                .route("", web::post().to(TenantController::toWrite))
                .route("/{id}", web::get().to(TenantController::toRead_by_id))
                .route("/{id}", web::put().to(TenantController::toUpdate))
                .route("/{id}", web::delete().to(TenantController::toRemove))
                .route("/{id}/members", web::get().to(TenantController::members))
                .route(
                    "/{id}/members",
                    web::post().to(TenantController::member_add),
                )
                .route(
                    "/{id}/members/{userID}",
                    web::put().to(TenantController::member_update),
                )
                .route(
                    "/{id}/members/{userID}",
                    web::delete().to(TenantController::member_remove),
                ),
        );
    }
}
