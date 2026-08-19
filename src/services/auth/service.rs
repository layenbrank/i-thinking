use crate::configures::configure::Configure;
use crate::databases::database;
use crate::services::auth::schema::{SigninRequest, SigninResponse, SignupRequest, SignupResponse};
use crate::utils::db::is_unique_violation;
use crate::utils::encryption::{EncryptionError, encrypt_password, verify_password};
use crate::utils::jwt::{JwtError, generate_token};
use crate::utils::response::{ApiErrorResponse, business};
use chrono::Utc;
use entity::users;
use sea_orm::{ActiveModelTrait, Set};
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("User already exists")]
    UserAlreadyExists,
    #[error("User not found")]
    UserNotFound,
    #[error("Invalid password")]
    InvalidPassword,
    #[error("Encryption error: {0}")]
    EncryptionError(#[from] EncryptionError),
    #[error("JWT error: {0}")]
    JwtError(#[from] JwtError),
    #[error("Database error: {0}")]
    DatabaseError(String),
}

impl From<AuthError> for ApiErrorResponse {
    fn from(err: AuthError) -> Self {
        match err {
            AuthError::UserAlreadyExists => {
                ApiErrorResponse::custom(business::user::USERNAME_EXISTS, "用户名已存在")
            }
            AuthError::UserNotFound => {
                ApiErrorResponse::custom(business::login::INVALID_CREDENTIALS, "用户名或密码错误")
            }
            AuthError::InvalidPassword => {
                ApiErrorResponse::custom(business::login::INVALID_CREDENTIALS, "用户名或密码错误")
            }
            AuthError::EncryptionError(e) => ApiErrorResponse::custom(
                business::login::INVALID_CREDENTIALS,
                format!("加密错误: {}", e),
            ),
            AuthError::JwtError(e) => ApiErrorResponse::custom(
                business::login::INVALID_CREDENTIALS,
                format!("JWT错误: {}", e),
            ),
            AuthError::DatabaseError(e) => ApiErrorResponse::custom(
                business::login::INVALID_CREDENTIALS,
                format!("数据库错误: {}", e),
            ),
        }
    }
}

fn map_db_err(err: sea_orm::DbErr) -> AuthError {
    if is_unique_violation(&err) {
        AuthError::UserAlreadyExists
    } else {
        AuthError::DatabaseError(err.to_string())
    }
}

pub struct AuthService;

impl AuthService {
    pub async fn signin(
        db: &database::Storage,
        req: SigninRequest,
        config: &Configure,
    ) -> Result<SigninResponse, AuthError> {
        let user = users::Entity::find_by_username(&req.username)
            .one(&db.db)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?
            .ok_or(AuthError::UserNotFound)?;

        let is_valid = verify_password(
            &req.password,
            &user.password,
            &config.encryption,
            config.aes_key.as_deref(),
        )?;

        if !is_valid {
            return Err(AuthError::InvalidPassword);
        }

        let token = generate_token(
            &user.id.to_string(),
            &user.username,
            &config.jwt_secret,
            None,
        )?;

        Ok(SigninResponse {
            token,
            user: user.into(),
        })
    }

    pub async fn signup(
        db: &database::Storage,
        req: SignupRequest,
        config: &Configure,
    ) -> Result<SignupResponse, AuthError> {
        let existing = users::Entity::find_by_username(&req.username)
            .one(&db.db)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        if existing.is_some() {
            return Err(AuthError::UserAlreadyExists);
        }

        let encrypted_password =
            encrypt_password(&req.password, &config.encryption, config.aes_key.as_deref())?;

        let now = Utc::now().fixed_offset();
        let user = users::ActiveModel {
            id: Set(Uuid::new_v4()),
            username: Set(req.username),
            password: Set(encrypted_password),
            email: Set(None),
            age: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
        }
        .insert(&db.db)
        .await
        .map_err(map_db_err)?;

        let token = generate_token(
            &user.id.to_string(),
            &user.username,
            &config.jwt_secret,
            None,
        )?;

        Ok(SignupResponse {
            token,
            user: user.into(),
        })
    }
}
