use crate::{
    services::engine::{schema::QueryP, service::EngineService},
    utils::response::{ErrorBody, Body, request},
};
use actix_web::{HttpRequest, Responder, web};

pub struct EngineController;

impl EngineController {
    pub async fn toRead(req: HttpRequest) -> impl Responder {
        // 手动提取查询参数，以便更好地处理错误
        let params = match web::Query::<QueryP>::from_query(req.query_string()) {
            Ok(query) => {
                let params = query.into_inner();
                tracing::debug!(%params, "QueryP");
                params
            }
            Err(err) => {
                // Query 参数解析失败，返回格式化的错误响应
                return ErrorBody::custom(
                    request::INVALID_PARAMETER_FORMAT,
                    format!("请求参数格式错误: {}", err),
                )
                .transform();
            }
        };

        // 直接传递 HttpRequest 给 service，统一在 controller 处理错误
        match EngineService::suggestion(params, &req).await {
            Ok(suggestion) => Body::success(suggestion, "获取搜索建议成功").transform(),
            Err(err) => {
                // 使用 From trait 自动转换错误
                ErrorBody::from(err).transform()
            }
        }
    }
}
