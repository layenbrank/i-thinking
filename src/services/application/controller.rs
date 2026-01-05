use crate::configures::configure::Configure;
use crate::databases::database::Storage;
use crate::services::application::{schema::Schema, service::Service};
use crate::utils::response::{ApiErrorResponse, ApiResponse};
use actix_web::{HttpResponse, Responder, Result, web};
use std::sync::Arc;

pub struct ApplicationController;

impl ApplicationController {
    pub async fn toRead(
        storage: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        req: web::Json<Schema>,
    ) -> impl Responder {
        match Service::toRead().await {
            Ok(applications) => {
                ApiResponse::success(applications, "Application read successfully").transform()
            }
            Err(e) => ApiErrorResponse::from(e).transform(),
        }
    }

    pub async fn toUpdate(
        storage: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        req: web::Json<Schema>,
    ) -> impl Responder {
        match Service::toRead().await {
            Ok(applications) => {
                ApiResponse::success(applications, "Application updated successfully").transform()
            }
            Err(e) => ApiErrorResponse::from(e).transform(),
        }
    }
}
