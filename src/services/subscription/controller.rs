use std::sync::Arc;

use actix_web::{HttpMessage, HttpRequest, HttpResponse, Result, web};
use uuid::Uuid;

use crate::clients::redis::RedisPool;
use crate::configures::configure::Configure;
use crate::databases::database::Storage;
use crate::filters::exception::Exception;
use crate::interceptors::envelope::Envelope;
use crate::services::subscription::schema::SubscribeP;
use crate::services::subscription::service::SubscriptionService;
use crate::utils::jwt::Claims;

pub struct SubscriptionController;

impl SubscriptionController {
    /// 租户订阅历史（含已取消 / 已到期）。
    pub async fn toList(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let tenant_id = parse_id(&path.into_inner())?;
        match SubscriptionService::list(&db, user_id, tenant_id, admin).await {
            Ok(items) => Envelope::success(items, "获取订阅列表成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    /// 开通 / 续订：重复调用即续订（旧订阅作废）。
    pub async fn toWrite(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        redis: web::Data<Arc<RedisPool>>,
        http: HttpRequest,
        path: web::Path<String>,
        req: web::Json<SubscribeP>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let tenant_id = parse_id(&path.into_inner())?;
        match SubscriptionService::subscribe(
            &db,
            &config,
            &redis,
            user_id,
            tenant_id,
            admin,
            req.into_inner(),
        )
        .await
        {
            Ok(item) => Envelope::write(item).transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    /// 取消订阅（立即失效）。
    pub async fn toRemove(
        db: web::Data<Arc<Storage>>,
        redis: web::Data<Arc<RedisPool>>,
        http: HttpRequest,
        path: web::Path<(String, String)>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let (tenant_id, subscription_id) = path.into_inner();
        let tenant_id = parse_id(&tenant_id)?;
        let subscription_id = parse_id(&subscription_id)?;
        match SubscriptionService::cancel(&db, &redis, user_id, tenant_id, admin, subscription_id)
            .await
        {
            Ok(()) => Envelope::message_only("取消订阅成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    /// 当前生效配额（免费档 / 订阅档位 / 全局兜底）。
    pub async fn quota(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        redis: web::Data<Arc<RedisPool>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let tenant_id = parse_id(&path.into_inner())?;
        match SubscriptionService::quota(&db, &config, &redis, user_id, tenant_id, admin).await {
            Ok(item) => Envelope::success(item, "获取当前配额成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }
}

fn identity(http: &HttpRequest) -> Result<(Uuid, bool), Exception> {
    let claims = http
        .extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| Exception::unauthorized("用户未登录"))?;
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| Exception::unauthorized("用户未登录"))?;
    Ok((user_id, claims.role().is_admin()))
}

fn parse_id(value: &str) -> Result<Uuid, Exception> {
    Uuid::parse_str(value).map_err(|_| Exception::bad_request("ID 格式无效"))
}
