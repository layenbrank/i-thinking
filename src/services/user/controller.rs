use crate::utils::response::ApiResponse;
use crate::{
    databases::database::Storage,
    services::user::{
        schema::{CreateUser, UpdateUser, UserResponse},
        service::UserService,
    },
};
use actix_web::{HttpRequest, HttpResponse, Result, error::ErrorInternalServerError, web};
use std::sync::Arc;

pub struct UserController;

impl UserController {
    pub async fn find_all(
        database: web::Data<Arc<Storage>>,
        _req: HttpRequest,
    ) -> Result<HttpResponse> {
        let users = UserService::find_all(&database)
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {}", e)))?;

        let resp: Vec<UserResponse> = users.into_iter().map(|u| u.into()).collect();

        ApiResponse::success(resp, "Users retrieved successfully").transform()
    }

    // Single
    // Multiple

    pub async fn find_one(
        db: web::Data<Arc<Storage>>,
        path: web::Path<String>,
        _req: HttpRequest,
    ) -> Result<HttpResponse> {
        let id = path.into_inner();

        let user = UserService::find_one(&db, &id)
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {}", e)))?;

        let resp: UserResponse = user.into();

        ApiResponse::success(resp, "User retrieved successfully").transform()
    }

    pub async fn insert(
        db: web::Data<Arc<Storage>>,
        req_body: web::Json<CreateUser>,
        _req: HttpRequest,
    ) -> Result<HttpResponse> {
        let user = UserService::insert(&db, req_body.into_inner())
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {}", e)))?;
        let resp: UserResponse = user.into();

        ApiResponse::insert(resp).transform()
    }

    pub async fn update(
        db: web::Data<Arc<Storage>>,
        path: web::Path<String>,
        req_body: web::Json<UpdateUser>,
        _req: HttpRequest,
    ) -> Result<HttpResponse> {
        let id = path.into_inner();

        let user = UserService::update(&db, &id, req_body.into_inner())
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {}", e)))?;

        let resp: UserResponse = user.into();

        ApiResponse::success(resp, "User updated successfully").transform()
    }

    pub async fn remove(
        db: web::Data<Arc<Storage>>,
        path: web::Path<String>,
        _req: HttpRequest,
    ) -> Result<HttpResponse> {
        let id = path.into_inner();

        UserService::remove(&db, &id)
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {}", e)))?;

        ApiResponse::message_only("User deleted successfully").transform()
    }
}
