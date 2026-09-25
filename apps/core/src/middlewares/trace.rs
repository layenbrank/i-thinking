//! W3C Trace Context（`traceparent`）—— 跨进程链路标识
//!
//! 契约约定：所有跨进程端点都接受并回显 `traceparent`；响应信封的 `traceID` 取自本
//! 中间件，入口日志同样记录它。于是用户只要提供一个 `traceID`，就能把「客户端反馈 →
//! 本服务访问日志 → 下游调用」串成一条链路。

use std::rc::Rc;

use actix_web::{
    Error, HttpMessage,
    body::MessageBody,
    dev::{Service, ServiceRequest, ServiceResponse, Transform, forward_ready},
    http::header::{HeaderName, HeaderValue},
};
use futures::future::{LocalBoxFuture, Ready, ok};
use rand::Rng;

/// W3C Trace Context 请求 / 响应头
pub const TRACEPARENT: &str = "traceparent";

/// `traceparent` version 段
const VERSION: &str = "00";
/// `traceparent` flags 段的 sampled 位
const FLAG_SAMPLED: u8 = 0x01;

tokio::task_local! {
    static CURRENT: TraceContext;
}

/// 单次请求的链路上下文
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TraceContext {
    /// 32 位十六进制，全链路唯一
    pub trace_id: String,
    /// 16 位十六进制，本进程本次请求的 span
    pub span_id: String,
    /// 上游 span（无上游调用时为空）
    pub parent_span_id: Option<String>,
    /// 上游的采样决定；无上游时默认采样
    pub sampled: bool,
}

impl TraceContext {
    /// 无上游链路时新建根上下文
    pub fn new_root() -> Self {
        Self {
            trace_id: random_hex::<16>(),
            span_id: random_hex::<8>(),
            parent_span_id: None,
            sampled: true,
        }
    }

    /// 解析上游 `traceparent`；格式非法或全零标识一律返回 `None`，由调用方新建根上下文
    pub fn parse(value: &str) -> Option<Self> {
        let mut parts = value.trim().split('-');
        let version = parts.next()?;
        let trace_id = parts.next()?;
        let parent_span_id = parts.next()?;
        let flags = parts.next()?;

        if !is_valid_segment(version, 2) || version.eq_ignore_ascii_case("ff") {
            return None;
        }
        // 低版本不允许追加字段；高版本允许携带未来扩展，故只校验前四段
        if version == VERSION && parts.next().is_some() {
            return None;
        }
        if !is_valid_segment(trace_id, 32) || is_all_zero(trace_id) {
            return None;
        }
        if !is_valid_segment(parent_span_id, 16) || is_all_zero(parent_span_id) {
            return None;
        }
        if !is_valid_segment(flags, 2) {
            return None;
        }

        let sampled = u8::from_str_radix(flags, 16).ok()? & FLAG_SAMPLED != 0;

        Some(Self {
            trace_id: trace_id.to_ascii_lowercase(),
            span_id: random_hex::<8>(),
            parent_span_id: Some(parent_span_id.to_ascii_lowercase()),
            sampled,
        })
    }

    /// 从请求头解析，缺失或非法时新建根上下文
    pub fn from_header(value: Option<&HeaderValue>) -> Self {
        value
            .and_then(|value| value.to_str().ok())
            .and_then(Self::parse)
            .unwrap_or_else(Self::new_root)
    }

    /// 回写 / 向下游转发的 `traceparent`（携带本进程 span）
    pub fn to_traceparent(&self) -> String {
        format!(
            "{VERSION}-{}-{}-{:02x}",
            self.trace_id,
            self.span_id,
            if self.sampled { FLAG_SAMPLED } else { 0 }
        )
    }
}

/// 当前任务的链路上下文；不在 HTTP 请求内（单测、后台任务）返回 `None`
pub fn current() -> Option<TraceContext> {
    CURRENT.try_with(TraceContext::clone).ok()
}

/// 当前任务的 `trace_id`，供响应信封与日志使用
pub fn current_trace_id() -> Option<String> {
    current().map(|ctx| ctx.trace_id)
}

/// 在给定链路上下文中执行 future（后台任务可据此把工作挂到某条链路上）
pub async fn scoped<F: std::future::Future>(ctx: TraceContext, fut: F) -> F::Output {
    CURRENT.scope(ctx, fut).await
}

/// 链路中间件：解析 / 新建 trace 上下文，放入请求扩展与任务作用域，并回显 `traceparent`
pub struct Trace;

impl<S, B> Transform<S, ServiceRequest> for Trace
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = TraceMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(TraceMiddleware {
            service: Rc::new(service),
        })
    }
}

pub struct TraceMiddleware<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for TraceMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = Rc::clone(&self.service);
        let ctx = TraceContext::from_header(req.headers().get(TRACEPARENT));
        let traceparent = ctx.to_traceparent();

        req.extensions_mut().insert(ctx.clone());

        Box::pin(async move {
            let mut res = CURRENT.scope(ctx, service.call(req)).await?;
            if let Ok(value) = HeaderValue::from_str(&traceparent) {
                res.headers_mut()
                    .insert(HeaderName::from_static(TRACEPARENT), value);
            }
            Ok(res)
        })
    }
}

fn is_valid_segment(segment: &str, len: usize) -> bool {
    segment.len() == len && segment.bytes().all(|b| b.is_ascii_hexdigit())
}

fn is_all_zero(segment: &str) -> bool {
    segment.bytes().all(|b| b == b'0')
}

fn random_hex<const N: usize>() -> String {
    let mut buf = [0u8; N];
    rand::rng().fill_bytes(&mut buf);
    buf.iter().map(|b| format!("{b:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{App, HttpResponse, test as awtest, web};

    const UPSTREAM: &str = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

    #[test]
    fn parses_valid_upstream_context() {
        let ctx = TraceContext::parse(UPSTREAM).expect("应解析成功");
        assert_eq!(ctx.trace_id, "4bf92f3577b34da6a3ce929d0e0e4736");
        assert_eq!(ctx.parent_span_id.as_deref(), Some("00f067aa0ba902b7"));
        assert!(ctx.sampled);
        // 本进程 span 必须是新生成的 16 位十六进制
        assert_ne!(ctx.span_id, "00f067aa0ba902b7");
        assert!(is_valid_segment(&ctx.span_id, 16));
    }

    #[test]
    fn inherits_unsampled_flag() {
        let ctx = TraceContext::parse("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00")
            .expect("应解析成功");
        assert!(!ctx.sampled);
        assert!(ctx.to_traceparent().ends_with("-00"));
    }

    #[test]
    fn tolerates_tracestate_extension_of_future_versions() {
        let value = "01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01-extra";
        assert!(TraceContext::parse(value).is_some());
    }

    #[test]
    fn rejects_malformed_context() {
        for bad in [
            "",
            "00",
            "00--00f067aa0ba902b7-01",
            // trace_id 全零
            "00-00000000000000000000000000000000-00f067aa0ba902b7-01",
            // parent_id 全零
            "00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01",
            // 长度不对
            "00-4bf92f3577b34da6a3ce929d0e0e47-00f067aa0ba902b7-01",
            // 非十六进制
            "00-4bf92f3577b34da6a3ce929d0e0e473g-00f067aa0ba902b7-01",
            // 非法 version
            "ff-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
            // 00 版本不允许追加字段
            "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01-extra",
        ] {
            assert!(
                TraceContext::parse(bad).is_none(),
                "{bad} 应被判定为非法 traceparent"
            );
        }
    }

    #[test]
    fn new_root_is_well_formed() {
        let ctx = TraceContext::new_root();
        assert!(is_valid_segment(&ctx.trace_id, 32));
        assert!(is_valid_segment(&ctx.span_id, 16));
        assert!(!is_all_zero(&ctx.trace_id));
        assert!(
            ctx.to_traceparent()
                .starts_with(&format!("00-{}-", ctx.trace_id))
        );

        let other = TraceContext::new_root();
        assert_ne!(ctx.trace_id, other.trace_id);
    }

    async fn echo_trace_id() -> HttpResponse {
        HttpResponse::Ok().body(current_trace_id().unwrap_or_else(|| "-".to_string()))
    }

    #[actix_web::test]
    async fn middleware_propagates_and_echoes_context() {
        let app = awtest::init_service(
            App::new()
                .wrap(Trace)
                .route("/x", web::get().to(echo_trace_id)),
        )
        .await;

        let req = awtest::TestRequest::get()
            .uri("/x")
            .insert_header((TRACEPARENT, UPSTREAM))
            .to_request();
        let resp = awtest::call_service(&app, req).await;

        let header = resp
            .headers()
            .get(TRACEPARENT)
            .expect("响应必须回显 traceparent")
            .to_str()
            .expect("traceparent 必须是可见字符")
            .to_string();
        let echoed = TraceContext::parse(&header).expect("回显的 traceparent 必须合法");
        assert_eq!(echoed.trace_id, "4bf92f3577b34da6a3ce929d0e0e4736");

        let body = awtest::read_body(resp).await;
        let body = std::str::from_utf8(&body).expect("body 是 utf-8");
        assert_eq!(
            body, echoed.trace_id,
            "handler 里取到的 trace_id 必须与回显一致"
        );
    }

    #[actix_web::test]
    async fn middleware_creates_context_without_upstream() {
        let app = awtest::init_service(
            App::new()
                .wrap(Trace)
                .route("/x", web::get().to(echo_trace_id)),
        )
        .await;

        let req = awtest::TestRequest::get().uri("/x").to_request();
        let resp = awtest::call_service(&app, req).await;

        let header = resp
            .headers()
            .get(TRACEPARENT)
            .expect("无上游也必须生成 traceparent")
            .to_str()
            .expect("traceparent 必须是可见字符")
            .to_string();
        let ctx = TraceContext::parse(&header).expect("自建的 traceparent 必须合法");
        let body = awtest::read_body(resp).await;
        assert_eq!(std::str::from_utf8(&body).unwrap(), ctx.trace_id);
        assert!(is_valid_segment(&ctx.span_id, 16));
    }

    #[test]
    fn context_is_absent_outside_request_scope() {
        assert!(current().is_none());
        assert!(current_trace_id().is_none());
    }
}
