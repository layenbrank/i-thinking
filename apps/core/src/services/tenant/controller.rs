use std::sync::Arc;

use actix_web::{HttpRequest, HttpResponse, Result, web};
use uuid::Uuid;

use crate::databases::database::Storage;
use crate::filters::exception::Exception;
use crate::guards::session::Session;
use crate::interceptors::envelope::Envelope;
use crate::services::tenant::schema::{MemberUpdateP, MemberWriteP, TenantUpdateP, TenantWriteP};
use crate::services::tenant::service::TenantService;

pub struct TenantController;

impl TenantController {
    pub async fn toList(db: web::Data<Arc<Storage>>, http: HttpRequest) -> Result<HttpResponse> {
        let (user_id, _) = identity(&http)?;
        match TenantService::list(&db, user_id).await {
            Ok(items) => Envelope::success(items, "获取租户列表成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn toWrite(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        req: web::Json<TenantWriteP>,
    ) -> Result<HttpResponse> {
        let (user_id, _) = identity(&http)?;
        match TenantService::create(&db, user_id, req.into_inner()).await {
            Ok(item) => Envelope::write(item).transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn toRead_by_id(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let tenant_id = parse_id(&path.into_inner())?;
        match TenantService::get(&db, user_id, tenant_id, admin).await {
            Ok(item) => Envelope::success(item, "获取租户成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn toUpdate(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
        req: web::Json<TenantUpdateP>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let tenant_id = parse_id(&path.into_inner())?;
        match TenantService::update(&db, user_id, tenant_id, admin, req.into_inner()).await {
            Ok(item) => Envelope::success(item, "更新租户成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn toRemove(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let tenant_id = parse_id(&path.into_inner())?;
        match TenantService::remove(&db, user_id, tenant_id, admin).await {
            Ok(()) => Envelope::message_only("删除租户成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn members(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let tenant_id = parse_id(&path.into_inner())?;
        match TenantService::list_members(&db, user_id, tenant_id, admin).await {
            Ok(items) => Envelope::success(items, "获取成员列表成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn member_add(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
        req: web::Json<MemberWriteP>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let tenant_id = parse_id(&path.into_inner())?;
        match TenantService::add_member(&db, user_id, tenant_id, admin, req.into_inner()).await {
            Ok(item) => Envelope::write(item).transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn member_update(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<(String, String)>,
        req: web::Json<MemberUpdateP>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let (tenant_raw, member_raw) = path.into_inner();
        let tenant_id = parse_id(&tenant_raw)?;
        let member_user = parse_id(&member_raw)?;
        match TenantService::update_member(
            &db,
            user_id,
            tenant_id,
            member_user,
            admin,
            req.into_inner(),
        )
        .await
        {
            Ok(item) => Envelope::success(item, "更新成员成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn member_remove(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<(String, String)>,
    ) -> Result<HttpResponse> {
        let (user_id, admin) = identity(&http)?;
        let (tenant_raw, member_raw) = path.into_inner();
        let tenant_id = parse_id(&tenant_raw)?;
        let member_user = parse_id(&member_raw)?;
        match TenantService::remove_member(&db, user_id, tenant_id, member_user, admin).await {
            Ok(()) => Envelope::message_only("移除成员成功").transform(),
            Err(err) => Exception::from(err).transform(),
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
