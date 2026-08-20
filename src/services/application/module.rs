use actix_web::web;

use crate::services::{
    application::controller::ApplicationController, auth::module::AuthModule,
    engine::module::EngineModule, search::module::SearchModule, upload::module::UploadModule,
    user::module::UserModule,
};

pub struct ApplicationModule;

impl ApplicationModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/api/v1")
                .configure(AuthModule::configure)
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
