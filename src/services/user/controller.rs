use crate::configures::configure::Configure;
use crate::utils::response::{Body, ErrorBody};
use crate::{
    databases::database::Storage,
    services::user::{
        schema::{UpdateP, WriteP},
        service::{ReadR, UserService},
    },
};
use actix_web::{HttpRequest, HttpResponse, Result, web};
use std::sync::Arc;

pub struct UserController;

impl UserController {
    pub async fn toRead(
        db: web::Data<Arc<Storage>>,
        req: HttpRequest,
    ) -> Result<HttpResponse> {
        let id = req.match_info().get("id");
        match UserService::toRead(&db, id).await {
            Ok(ReadR::One(user)) => Body::success(user, "获取用户成功").transform(),
            Ok(ReadR::Many(users)) => Body::success(users, "获取用户列表成功").transform(),
            Err(err) => ErrorBody::from(err).transform(),
        }
    }

    pub async fn toWrite(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        req_body: web::Json<WriteP>,
    ) -> Result<HttpResponse> {
        match UserService::toWrite(&db, &config, req_body.into_inner()).await {
            Ok(user) => Body::write(user).transform(),
            Err(err) => ErrorBody::from(err).transform(),
        }
    }

    pub async fn toUpdate(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        path: web::Path<String>,
        req_body: web::Json<UpdateP>,
    ) -> Result<HttpResponse> {
        let id = path.into_inner();
        match UserService::toUpdate(&db, &config, &id, req_body.into_inner()).await {
            Ok(user) => Body::success(user, "更新用户成功").transform(),
            Err(err) => ErrorBody::from(err).transform(),
        }
    }

    pub async fn toRemove(
        db: web::Data<Arc<Storage>>,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let id = path.into_inner();
        match UserService::toRemove(&db, &id).await {
            Ok(()) => Body::message_only("删除用户成功").transform(),
            Err(err) => ErrorBody::from(err).transform(),
        }
    }
}
