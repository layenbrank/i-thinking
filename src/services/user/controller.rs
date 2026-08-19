use crate::configures::configure::Configure;
use crate::utils::response::{ApiErrorResponse, ApiResponse};
use crate::{
    databases::database::Storage,
    services::user::{
        schema::{CreateUser, UpdateUser, UserResponse},
        service::UserService,
    },
};
use actix_web::{HttpResponse, Result, web};
use std::sync::Arc;

pub struct UserController;

impl UserController {
    pub async fn find_all(database: web::Data<Arc<Storage>>) -> Result<HttpResponse> {
        match UserService::find_all(&database).await {
            Ok(users) => {
                let resp: Vec<UserResponse> = users.into_iter().map(|u| u.into()).collect();
                ApiResponse::success(resp, "Users retrieved successfully").transform()
            }
            Err(err) => ApiErrorResponse::from(err).transform(),
        }
    }

    pub async fn find_one(
        db: web::Data<Arc<Storage>>,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let id = path.into_inner();
        match UserService::find_one(&db, &id).await {
            Ok(user) => {
                ApiResponse::success(UserResponse::from(user), "User retrieved successfully")
                    .transform()
            }
            Err(err) => ApiErrorResponse::from(err).transform(),
        }
    }

    pub async fn insert(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        req_body: web::Json<CreateUser>,
    ) -> Result<HttpResponse> {
        match UserService::insert(&db, &config, req_body.into_inner()).await {
            Ok(user) => ApiResponse::insert(UserResponse::from(user)).transform(),
            Err(err) => ApiErrorResponse::from(err).transform(),
        }
    }

    pub async fn update(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        path: web::Path<String>,
        req_body: web::Json<UpdateUser>,
    ) -> Result<HttpResponse> {
        let id = path.into_inner();
        match UserService::update(&db, &config, &id, req_body.into_inner()).await {
            Ok(user) => ApiResponse::success(UserResponse::from(user), "User updated successfully")
                .transform(),
            Err(err) => ApiErrorResponse::from(err).transform(),
        }
    }

    pub async fn remove(
        db: web::Data<Arc<Storage>>,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let id = path.into_inner();
        match UserService::remove(&db, &id).await {
            Ok(()) => ApiResponse::message_only("User deleted successfully").transform(),
            Err(err) => ApiErrorResponse::from(err).transform(),
        }
    }
}
