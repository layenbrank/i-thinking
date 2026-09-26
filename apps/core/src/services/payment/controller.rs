use std::sync::Arc;

use actix_web::{HttpRequest, HttpResponse, Result, web};
use uuid::Uuid;

use crate::clients::redis::RedisPool;
use crate::configures::configure::Configure;
use crate::databases::database::Storage;
use crate::filters::exception::Exception;
use crate::guards::session::Session;
use crate::interceptors::envelope::Envelope;
use crate::services::payment::channel::{ALIPAY, NotifyInput, WECHAT};
use crate::services::payment::schema::OrderP;
use crate::services::payment::service::PaymentService;

/// 订单列表一次返回的条数。
const ORDER_LIST_LIMIT: u64 = 20;

/// 微信支付回执（**必须**是微信要求的原始报文，不能套平台响应信封）。
const WECHAT_ACK_OK: &str = r#"{"code":"SUCCESS","message":"成功"}"#;
const WECHAT_ACK_FAIL: &str = r#"{"code":"FAIL","message":"验签或处理失败"}"#;
/// 支付宝回执（纯文本，无信封、无 JSON）。
const ALIPAY_ACK_OK: &str = "success";
const ALIPAY_ACK_FAIL: &str = "failure";

pub struct PaymentController;

impl PaymentController {
    /// 价格 / 渠道目录（含当前生效档位）。
    pub async fn catalog(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        redis: web::Data<Arc<RedisPool>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let tenant_id = parse_id(&path.into_inner())?;
        match PaymentService::catalog(&db, &config, &redis, user_id, tenant_id, admin).await {
            Ok(item) => Envelope::success(item, "获取支付目录成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    /// 订单列表（最近 20 条）。
    pub async fn toList(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let tenant_id = parse_id(&path.into_inner())?;
        match PaymentService::list(&db, &config, user_id, tenant_id, admin, ORDER_LIST_LIMIT).await
        {
            Ok(items) => Envelope::success(items, "获取订单列表成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    /// 下单：返回 `codeUrl` 供客户端渲染二维码。
    pub async fn toWrite(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        http: HttpRequest,
        path: web::Path<String>,
        req: web::Json<OrderP>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let tenant_id = parse_id(&path.into_inner())?;
        match PaymentService::create(&db, &config, user_id, tenant_id, admin, req.into_inner())
            .await
        {
            Ok(item) => Envelope::write(item).transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    /// 订单详情。
    pub async fn detail(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        http: HttpRequest,
        path: web::Path<(String, String)>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let (tenant_id, order_no) = path.into_inner();
        let tenant_id = parse_id(&tenant_id)?;
        match PaymentService::get(&db, &config, user_id, tenant_id, admin, &order_no).await {
            Ok(item) => Envelope::success(item, "获取订单成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    /// 主动查单（回调丢失兜底 / 客户端「刷新支付状态」）。
    pub async fn sync(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        redis: web::Data<Arc<RedisPool>>,
        http: HttpRequest,
        path: web::Path<(String, String)>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let (tenant_id, order_no) = path.into_inner();
        let tenant_id = parse_id(&tenant_id)?;
        match PaymentService::sync(&db, &config, &redis, user_id, tenant_id, admin, &order_no).await
        {
            Ok(item) => Envelope::success(item, "订单状态已同步").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    /// 关闭订单（用户取消支付）。
    pub async fn close(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        http: HttpRequest,
        path: web::Path<(String, String)>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let (tenant_id, order_no) = path.into_inner();
        let tenant_id = parse_id(&tenant_id)?;
        match PaymentService::close(&db, &config, user_id, tenant_id, admin, &order_no).await {
            Ok(item) => Envelope::success(item, "订单已关闭").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    /// 微信支付结果通知（匿名端点，安全完全依赖签名校验 + 金额核对）。
    ///
    /// 回执必须符合微信约定：成功 `200 {"code":"SUCCESS"}`，失败 `500 {"code":"FAIL"}`，
    /// 否则微信会持续重试或直接把该笔标记为异常。
    pub async fn notify_wechat(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        redis: web::Data<Arc<RedisPool>>,
        http: HttpRequest,
        body: web::Bytes,
    ) -> Result<HttpResponse> {
        let body = String::from_utf8_lossy(&body).to_string();
        let input = NotifyInput {
            body: &body,
            timestamp: header(&http, "Wechatpay-Timestamp"),
            nonce: header(&http, "Wechatpay-Nonce"),
            signature: header(&http, "Wechatpay-Signature"),
            serial: header(&http, "Wechatpay-Serial"),
        };
        match PaymentService::notify(&db, &config, &redis, WECHAT, input).await {
            Ok(()) => Ok(json_ack(WECHAT_ACK_OK, 200)),
            Err(err) => {
                tracing::error!(error = %err, "wechat notify rejected");
                Ok(json_ack(WECHAT_ACK_FAIL, 500))
            }
        }
    }

    /// 支付宝异步通知（匿名端点）。
    ///
    /// 回执是纯文本 `success` / `failure`：返回 `failure` 时支付宝会按节奏重试，
    /// 因此**只有**验签、金额核对、开通订阅全部成功才应答 `success`。
    pub async fn notify_alipay(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        redis: web::Data<Arc<RedisPool>>,
        body: web::Bytes,
    ) -> Result<HttpResponse> {
        let body = String::from_utf8_lossy(&body).to_string();
        let input = NotifyInput {
            body: &body,
            timestamp: None,
            nonce: None,
            signature: None,
            serial: None,
        };
        match PaymentService::notify(&db, &config, &redis, ALIPAY, input).await {
            Ok(()) => Ok(text_ack(ALIPAY_ACK_OK)),
            Err(err) => {
                tracing::error!(error = %err, "alipay notify rejected");
                Ok(text_ack(ALIPAY_ACK_FAIL))
            }
        }
    }
}

fn identity(http: &HttpRequest) -> Result<(Uuid, bool), Exception> {
    let session = Session::of(http).ok_or_else(|| Exception::unauthorized("用户未登录"))?;

    Ok((session.user_id().as_uuid(), session.is_platform_admin()))
}

fn parse_id(value: &str) -> Result<Uuid, Exception> {
    Uuid::parse_str(value).map_err(|_| Exception::bad_request("ID 格式无效"))
}

/// 读取请求头（缺失 / 非 UTF-8 视为缺失，交由渠道层报「签名头不全」）。
fn header<'a>(http: &'a HttpRequest, name: &str) -> Option<&'a str> {
    http.headers().get(name)?.to_str().ok()
}

fn json_ack(body: &str, status: u16) -> HttpResponse {
    HttpResponse::build(actix_web::http::StatusCode::from_u16(status).unwrap_or_default())
        .content_type("application/json")
        .body(body.to_string())
}

fn text_ack(body: &str) -> HttpResponse {
    HttpResponse::Ok()
        .content_type("text/plain; charset=utf-8")
        .body(body.to_string())
}
