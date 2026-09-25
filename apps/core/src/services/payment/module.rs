use actix_web::web;

use crate::services::payment::controller::PaymentController;

/// 支付路由。
///
/// 与订阅模块同一套挂载法则：**只注册相对路径的 `web::resource`**，由父级 scope 提供前缀，
/// 避免与父级前缀 scope 同层并列时被 actix 的 `ResourceMap` 吞掉。
pub struct PaymentModule;

impl PaymentModule {
    /// 租户面：挂在 `TenantModule` 的 `/tenants` scope 下（继承登录鉴权）。
    pub fn configure_tenant(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::resource("/{id}/orders")
                .route(web::get().to(PaymentController::toList))
                .route(web::post().to(PaymentController::toWrite)),
        )
        .service(
            web::resource("/{id}/orders/{orderNo}").route(web::get().to(PaymentController::detail)),
        )
        .service(
            web::resource("/{id}/orders/{orderNo}/sync")
                .route(web::post().to(PaymentController::sync)),
        )
        .service(
            web::resource("/{id}/orders/{orderNo}/close")
                .route(web::post().to(PaymentController::close)),
        )
        // 档位 / 渠道目录
        .service(
            web::resource("/{id}/pay/catalog").route(web::get().to(PaymentController::catalog)),
        );
    }

    /// 渠道回调：挂在 `/api/v1` scope 下，**匿名**（真实性与时效性由渠道签名校验保证）。
    pub fn configure_notify(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::resource("/pay/notify/wechat")
                .route(web::post().to(PaymentController::notify_wechat)),
        )
        .service(
            web::resource("/pay/notify/alipay")
                .route(web::post().to(PaymentController::notify_alipay)),
        );
    }
}
