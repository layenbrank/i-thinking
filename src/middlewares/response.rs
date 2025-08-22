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

    fn call(&self, mut req: ServiceRequest) -> Self::Future {
        // 生成请求 ID
        let request_id = Uuid::new_v4().to_string();

        // 记录请求信息到日志 - 将需要的数据克隆以避免生命周期问题
        let method = req.method().as_str().to_string();
        let path = req.path().to_string();
        let start_time = std::time::Instant::now();

        println!("REQUEST [{}] {} {} - Started", request_id, method, path);

        // 将请求 ID 存储在请求扩展中
        req.extensions_mut().insert(request_id.clone());

        let fut = self.service.call(req);

        Box::pin(async move {
            let response = fut.await;
            let duration = start_time.elapsed();

            match &response {
                Ok(resp) => {
                    let status = resp.status().as_u16();
                    println!(
                        "RESPONSE [{}] {} {} - {} - {}ms",
                        request_id,
                        method,
                        path,
                        status,
                        duration.as_millis()
                    );
                }
                Err(err) => {
                    println!(
                        "ERROR [{}] {} {} - {} - {}ms",
                        request_id,
                        method,
                        path,
                        err,
                        duration.as_millis()
                    );
                }
            }

            response
        })
    }
}
