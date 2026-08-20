use crate::clients::elasticsearch::EsClient;
use crate::services::search::schema::{QueryP, WriteP};
use crate::services::search::service::SearchService;
use crate::utils::response::{Body, ErrorBody};
use actix_web::{HttpResponse, Result, web};
use std::sync::Arc;

pub struct SearchController;

impl SearchController {
    /// 索引文档
    pub async fn toWrite(
        es: web::Data<Arc<EsClient>>,
        req: web::Json<WriteP>,
    ) -> Result<HttpResponse> {
        match SearchService::toWrite(&es, req.into_inner()).await {
            Ok(data) => Body::success(data, "索引成功").transform(),
            Err(err) => ErrorBody::from(err).transform(),
        }
    }

    /// 全文检索
    pub async fn toRead(
        es: web::Data<Arc<EsClient>>,
        query: web::Query<QueryP>,
    ) -> Result<HttpResponse> {
        match SearchService::toRead(&es, query.into_inner()).await {
            Ok(data) => Body::success(data, "搜索成功").transform(),
            Err(err) => ErrorBody::from(err).transform(),
        }
    }
}
