use actix_web::web;

use crate::middlewares::rate_limit::AuthGovernor;
use crate::services::{
    application::controller::ApplicationController, auth::module::AuthModule,
    engine::module::EngineModule, search::module::SearchModule, upload::module::UploadModule,
    user::module::UserModule,
};

pub struct ApplicationModule;

impl ApplicationModule {
    pub fn configure(cfg: &mut web::ServiceConfig, auth_governor: AuthGovernor) {
        cfg.service(
            web::scope("/api/v1")
                .configure(|c| AuthModule::configure(c, &auth_governor))
                .configure(UserModule::configure)
                .configure(UploadModule::configure)
                .configure(EngineModule::configure)
                .configure(SearchModule::configure)
                .service(
                    web::scope("/application")
                        .route("/toRead", web::get().to(ApplicationController::toRead)),
                ),
        );
    }
}
