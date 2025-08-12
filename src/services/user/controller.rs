use crate::database::DataBase;
use crate::errors::AppResult;
use crate::services::user::schema::{CreateUser, UpdateUser, UserResponse};
use crate::services::user::service::UserService;
use actix_web::{HttpResponse, web};
use std::sync::Arc;

pub struct UserController;

impl UserController {
    pub async fn find_all(database: web::Data<Arc<DataBase>>) -> AppResult<HttpResponse> {
        let users = UserService::find_all(&database).await?;
        let resp: Vec<UserResponse> = users.into_iter().map(|u| u.into()).collect();
        Ok(HttpResponse::Ok().json(resp))
    }

    pub async fn find_one(
        db: web::Data<Arc<DataBase>>,
        path: web::Path<String>,
    ) -> AppResult<HttpResponse> {
        let user_id = path.into_inner();
        let user = UserService::find_one(&db, &user_id).await?;
        let resp: UserResponse = user.into();
        Ok(HttpResponse::Ok().json(resp))
    }

    pub async fn insert(
        db: web::Data<Arc<DataBase>>,
        req: web::Json<CreateUser>,
    ) -> AppResult<HttpResponse> {
        let user = UserService::insert(&db, req.into_inner()).await?;

        let resp: UserResponse = user.into();

        Ok(HttpResponse::Created().json(resp))
    }

    pub async fn update(
        db: web::Data<Arc<DataBase>>,
        path: web::Path<String>,
        req: web::Json<UpdateUser>,
    ) -> AppResult<HttpResponse> {
        let id = path.into_inner();
        let user = UserService::update(&db, &id, req.into_inner()).await?;
        let resp: UserResponse = user.into();

        Ok(HttpResponse::Ok().json(resp))
    }

    pub async fn remove(
        db: web::Data<Arc<DataBase>>,
        path: web::Path<String>,
    ) -> AppResult<HttpResponse> {
        let id = path.into_inner();
        UserService::remove(&db, &id).await?;
        Ok(HttpResponse::NoContent().finish())
    }
}
