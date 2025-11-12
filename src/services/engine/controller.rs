use crate::{
    services::engine::service::{EngineService, Suggestion, URLParams},
    utils::response::{ApiErrorResponse, ApiResponse, data},
};
use actix_web::{HttpResponse, Result, web};

pub struct EngineController;

impl EngineController {
    pub async fn find(path: web::Query<URLParams>) -> Result<HttpResponse> {
        let params = path.clone();
        println!("URLParams: {:?}", params);
        let suggestion = EngineService::suggestion(params.clone()).await;

        match suggestion {
            Ok(suggestion) => ApiResponse::success(suggestion, "Suggestion found").transform(),
            Err(error) => {
                ApiErrorResponse::custom(data::DATA_INCONSISTENCY, "Failed to find suggestion")
                    .transform()
            }
        }
    }
}
