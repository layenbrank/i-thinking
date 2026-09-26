use std::sync::Arc;

use actix_web::{HttpRequest, HttpResponse, Result, web};
use uuid::Uuid;

use crate::clients::redis::RedisPool;
use crate::configures::configure::Configure;
use crate::databases::database::Storage;
use crate::filters::exception::Exception;
use crate::guards::session::Session;
use crate::interceptors::envelope::Envelope;
use crate::services::sso::schema::{SsoCallbackP, SsoConnectionUpdateP, SsoConnectionWriteP};
use crate::services::sso::service::SsoService;

pub struct SsoController;

impl SsoController {
    // ---- 后台连接 CRUD ----

    pub async fn connections(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
    ) -> Result<HttpResponse> {
        let _ = actor(&http)?;
        match SsoService::list_connections(&db).await {
            Ok(items) => Envelope::success(items, "获取 SSO 连接列表成功").transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    pub async fn connection_write(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        http: HttpRequest,
        req: web::Json<SsoConnectionWriteP>,
    ) -> Result<HttpResponse> {
        let actor = actor(&http)?;
        match SsoService::create_connection(&db, &config, actor, req.into_inner()).await {
            Ok(item) => Envelope::write(item).transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    pub async fn connection_update(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        http: HttpRequest,
        path: web::Path<String>,
        req: web::Json<SsoConnectionUpdateP>,
    ) -> Result<HttpResponse> {
        let actor = actor(&http)?;
        let id = parse_id(&path.into_inner())?;
        match SsoService::update_connection(&db, &config, actor, id, req.into_inner()).await {
            Ok(item) => Envelope::success(item, "更新 SSO 连接成功").transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    pub async fn connection_remove(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let _ = actor(&http)?;
        let id = parse_id(&path.into_inner())?;
        match SsoService::delete_connection(&db, id).await {
            Ok(()) => Envelope::message_only("删除 SSO 连接成功").transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }

    // ---- OIDC 流程 ----

    pub async fn authorize(
        db: web::Data<Arc<Storage>>,
        redis: web::Data<Arc<RedisPool>>,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let id = parse_id(&path.into_inner())?;
        match SsoService::authorize(&db, &redis, id).await {
            Ok(url) => Ok(HttpResponse::Found()
                .append_header(("Location", url))
                .finish()),
            Err(e) => Exception::from(e).transform(),
        }
    }

    pub async fn callback(
        db: web::Data<Arc<Storage>>,
        redis: web::Data<Arc<RedisPool>>,
        config: web::Data<Arc<Configure>>,
        path: web::Path<String>,
        query: web::Query<SsoCallbackP>,
    ) -> Result<HttpResponse> {
        let id = parse_id(&path.into_inner())?;
        let query = query.into_inner();
        match SsoService::callback(&db, &redis, &config, id, &query.code, &query.state).await {
            Ok(item) => Envelope::success(item, "登录成功").transform(),
            Err(e) => Exception::from(e).transform(),
        }
    }
}

fn actor(http: &HttpRequest) -> Result<Uuid, Exception> {
    let session = Session::of(http).ok_or_else(|| Exception::unauthorized("用户未登录"))?;

    Ok(session.user_id().as_uuid())
}

fn parse_id(value: &str) -> Result<Uuid, Exception> {
    Uuid::parse_str(value).map_err(|_| Exception::bad_request("ID 格式无效"))
}
