use crate::{utils::response::{ApiResponse,data,ApiErrorResponse}, services::engine::service::{EngineService,URLParams, Suggestion}};
use actix_web::{Result,HttpResponse,web};


pub struct  EngineController ;

impl EngineController {
 pub async fn find(path:web::Query<URLParams>) ->Result<HttpResponse>  {
   let  params = path.clone();
  println!("URLParams: {:?}", params);
  let suggestion=  EngineService::suggestion(params.clone()).await;

  match suggestion {
    Ok(suggestion) => {
      ApiResponse::success(suggestion, "Suggestion found").transform()
    }
    Err(error) => {
      ApiErrorResponse::custom(data::DATA_INCONSISTENCY, "Failed to find suggestion").transform()
    }
  }
  }
}
