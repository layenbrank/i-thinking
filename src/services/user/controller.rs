use crate::database::DataBase;
use crate::services::user::schema::{CreateUser, UpdateUser, UserResponse};
use crate::services::user::service::UserService;
use crate::utils::response::ApiResponse;
use actix_web::{HttpRequest, HttpResponse, Result, error::ErrorInternalServerError, web};
use std::sync::Arc;

pub struct UserController;

impl UserController {
    pub async fn find_all(
        database: web::Data<Arc<DataBase>>,
        req: HttpRequest,
    ) -> Result<HttpResponse> {
        let users = UserService::find_all(&database)
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {}", e)))?;
        let resp: Vec<UserResponse> = users.into_iter().map(|u| u.into()).collect();

        let response = ApiResponse::success(resp);

        response.transform()
    }

    pub async fn find_one(
        db: web::Data<Arc<DataBase>>,
        path: web::Path<String>,
        req: HttpRequest,
    ) -> Result<HttpResponse> {
        let user_id = path.into_inner();
        let user = UserService::find_one(&db, &user_id)
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {}", e)))?;
        let resp: UserResponse = user.into();

        let response = ApiResponse::success(resp);

        response.transform()
    }

    pub async fn insert(
        db: web::Data<Arc<DataBase>>,
        req_body: web::Json<CreateUser>,
        req: HttpRequest,
    ) -> Result<HttpResponse> {
        let user = UserService::insert(&db, req_body.into_inner())
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {}", e)))?;
        let resp: UserResponse = user.into();

        let response = ApiResponse::created(resp);

        response.transform()
    }

    pub async fn update(
        db: web::Data<Arc<DataBase>>,
        path: web::Path<String>,
        req_body: web::Json<UpdateUser>,
        req: HttpRequest,
    ) -> Result<HttpResponse> {
        let id = path.into_inner();
        let user = UserService::update(&db, &id, req_body.into_inner())
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {}", e)))?;
        let resp: UserResponse = user.into();

        let response = ApiResponse::success_with_message(resp, "User updated successfully");

        response.transform()
    }

    pub async fn remove(
        db: web::Data<Arc<DataBase>>,
        path: web::Path<String>,
        req: HttpRequest,
    ) -> Result<HttpResponse> {
        let id = path.into_inner();
        UserService::remove(&db, &id)
            .await
            .map_err(|e| ErrorInternalServerError(format!("Database error: {}", e)))?;

        let response = ApiResponse::message_only("User deleted successfully");

        response.transform()
    }
}
