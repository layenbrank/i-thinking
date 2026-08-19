use crate::{
    configures::configure::Configure,
    databases::database::Storage,
    services::user::schema::{CreateUser, UpdateUser},
    utils::{
        db::is_unique_violation,
        encryption::{EncryptionError, encrypt_password},
        response::{ApiErrorResponse, business, request},
    },
};
use chrono::Utc;
use entity::users;
use sea_orm::{ActiveModelTrait, EntityTrait, Set};
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum UserError {
    #[error("User already exists")]
    UserAlreadyExists,
    #[error("User not found")]
    UserNotFound,
    #[error("Invalid user ID")]
    InvalidId,
    #[error("Encryption error: {0}")]
    EncryptionError(#[from] EncryptionError),
    #[error("Database error: {0}")]
    DatabaseError(String),
}

impl From<UserError> for ApiErrorResponse {
    fn from(err: UserError) -> Self {
        match err {
            UserError::UserAlreadyExists => {
                ApiErrorResponse::custom(business::user::USERNAME_EXISTS, "用户名已存在")
            }
            UserError::UserNotFound => {
                ApiErrorResponse::custom(business::user::NOT_FOUND, "用户不存在")
            }
            UserError::InvalidId => {
                ApiErrorResponse::custom(request::INVALID_PARAMETER_VALUE, "Invalid user ID")
            }
            UserError::EncryptionError(e) => {
                ApiErrorResponse::internal_error(format!("加密错误: {e}"))
            }
            UserError::DatabaseError(e) => {
                ApiErrorResponse::internal_error(format!("Database error: {e}"))
            }
        }
    }
}

fn map_db_err(err: sea_orm::DbErr) -> UserError {
    if is_unique_violation(&err) {
        UserError::UserAlreadyExists
    } else {
        UserError::DatabaseError(err.to_string())
    }
}

pub struct UserService;

impl UserService {
    pub async fn insert(
        db: &Storage,
        config: &Configure,
        req: CreateUser,
    ) -> Result<users::Model, UserError> {
        if users::Entity::find_by_username(&req.username)
            .one(&db.db)
            .await
            .map_err(|e| UserError::DatabaseError(e.to_string()))?
            .is_some()
        {
            return Err(UserError::UserAlreadyExists);
        }

        let password =
            encrypt_password(&req.password, &config.encryption, config.aes_key.as_deref())?;
        let now = Utc::now().fixed_offset();
        users::ActiveModel {
            id: Set(Uuid::new_v4()),
            username: Set(req.username),
            password: Set(password),
            email: Set(None),
            age: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
        }
        .insert(&db.db)
        .await
        .map_err(map_db_err)
    }

    pub async fn find_one(db: &Storage, id: &str) -> Result<users::Model, UserError> {
        let id = Uuid::parse_str(id).map_err(|_| UserError::InvalidId)?;
        users::Entity::find_by_id(id)
            .one(&db.db)
            .await
            .map_err(|e| UserError::DatabaseError(e.to_string()))?
            .ok_or(UserError::UserNotFound)
    }

    pub async fn find_all(db: &Storage) -> Result<Vec<users::Model>, UserError> {
        users::Entity::find()
            .all(&db.db)
            .await
            .map_err(|e| UserError::DatabaseError(e.to_string()))
    }

    pub async fn update(
        db: &Storage,
        config: &Configure,
        id: &str,
        req: UpdateUser,
    ) -> Result<users::Model, UserError> {
        let id = Uuid::parse_str(id).map_err(|_| UserError::InvalidId)?;
        let model = users::Entity::find_by_id(id)
            .one(&db.db)
            .await
            .map_err(|e| UserError::DatabaseError(e.to_string()))?
            .ok_or(UserError::UserNotFound)?;

        let mut active: users::ActiveModel = model.into();
        if let Some(username) = req.username {
            active.username = Set(username);
        }
        if let Some(password) = req.password {
            active.password = Set(encrypt_password(
                &password,
                &config.encryption,
                config.aes_key.as_deref(),
            )?);
        }
        if let Some(email) = req.email {
            active.email = Set(Some(email));
        }
        if let Some(age) = req.age {
            active.age = Set(Some(age as i32));
        }
        active.updated_at = Set(Utc::now().fixed_offset());

        active.update(&db.db).await.map_err(map_db_err)
    }

    pub async fn remove(db: &Storage, id: &str) -> Result<(), UserError> {
        let id = Uuid::parse_str(id).map_err(|_| UserError::InvalidId)?;
        let result = users::Entity::delete_by_id(id)
            .exec(&db.db)
            .await
            .map_err(|e| UserError::DatabaseError(e.to_string()))?;

        if result.rows_affected == 0 {
            return Err(UserError::UserNotFound);
        }

        Ok(())
    }
}
