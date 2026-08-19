use crate::services::{
    auth::module::AuthModule, engine::module::EngineModule,
    magneticTile::controller::ApplicationController, upload::module::UploadModule,
    user::module::UserModule,
};
use actix_web::web;

pub struct ApplicationModule;

impl ApplicationModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/api/v1")
                .configure(AuthModule::configure)
                .configure(UserModule::configure)
                .configure(UploadModule::configure)
                .configure(EngineModule::configure)
                .service(
                    web::scope("/magnetic-tile")
                        .route("/toRead", web::get().to(ApplicationController::toRead)),
                ),
        );
    }
}
