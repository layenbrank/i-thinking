use crate::configures::configure::Configure;
use crate::databases::database::Storage;
use crate::services::application::{schema::App, service::ApplicationService};
use crate::utils::response::{Body, ErrorBody};
use actix_web::{Responder, web};
use std::sync::Arc;

pub struct ApplicationController;

impl ApplicationController {
    pub async fn toRead(
        _storage: web::Data<Arc<Storage>>,
        _config: web::Data<Arc<Configure>>,
        _req: web::Json<App>,
    ) -> impl Responder {
        match ApplicationService::toRead().await {
            Ok(app) => Body::success(app, "获取应用成功").transform(),
            Err(e) => ErrorBody::from(e).transform(),
        }
    }

    pub async fn toUpdate(
        _storage: web::Data<Arc<Storage>>,
        _config: web::Data<Arc<Configure>>,
        _req: web::Json<App>,
    ) -> impl Responder {
        match ApplicationService::toRead().await {
            Ok(app) => Body::success(app, "更新应用成功").transform(),
            Err(e) => ErrorBody::from(e).transform(),
        }
    }
}
