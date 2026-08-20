#![allow(non_snake_case)]

use actix_web::{
    Error, HttpMessage,
    dev::{ServiceRequest, ServiceResponse, Transform},
};
use futures::future::{LocalBoxFuture, Ready, ok};
use std::task::{Context, Poll};
use uuid::Uuid;

/// 响应包装中间件
pub struct ResponseWrapper;

impl<S, B> Transform<S, ServiceRequest> for ResponseWrapper
where
    S: actix_web::dev::Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = ResponseWrapperMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(ResponseWrapperMiddleware { service })
    }
}

pub struct ResponseWrapperMiddleware<S> {
    service: S,
}

impl<S, B> actix_web::dev::Service<ServiceRequest> for ResponseWrapperMiddleware<S>
where
    S: actix_web::dev::Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let request_id = Uuid::new_v4().to_string();
        let method = req.method().as_str().to_string();
        let path = req.path().to_string();
        let start_time = std::time::Instant::now();
        let client_ip = req
            .connection_info()
            .peer_addr()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "Unknown".to_string());

        req.extensions_mut().insert(request_id.clone());

        let fut = self.service.call(req);

        Box::pin(async move {
            let response = fut.await;
            let duration_ms = start_time.elapsed().as_millis() as u64;

            match &response {
                Ok(resp) => {
                    let status = resp.status().as_u16();
                    // 摘要放进 message，终端一眼能扫到 METHOD PATH STATUS
                    if status < 400 {
                        tracing::info!(
                            request_id = %request_id,
                            client_ip = %client_ip,
                            duration_ms,
                            "{method} {path} → {status}"
                        );
                    } else {
                        tracing::warn!(
                            request_id = %request_id,
                            client_ip = %client_ip,
                            duration_ms,
                            "{method} {path} → {status}"
                        );
                    }
                }
                Err(err) => {
                    tracing::error!(
                        request_id = %request_id,
                        client_ip = %client_ip,
                        duration_ms,
                        error = %err,
                        "{method} {path} → failed"
                    );
                }
            }

            response
        })
    }
}
