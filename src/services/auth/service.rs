use crate::configures::configure::Configure;
use crate::databases::database;
use crate::services::auth::schema::{
    AuthUser, SigninRequest, SigninResponse, SignupRequest, SignupResponse,
};
use crate::utils::encryption::{encrypt_password, verify_password, EncryptionError};
use crate::utils::jwt::{generate_token, JwtError};
use crate::utils::response::{ApiErrorResponse, business};
use mongodb::bson::{doc, DateTime};

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
            AuthError::EncryptionError(e) => {
                ApiErrorResponse::custom(business::login::INVALID_CREDENTIALS, format!("加密错误: {}", e))
            }
            AuthError::JwtError(e) => {
                ApiErrorResponse::custom(business::login::INVALID_CREDENTIALS, format!("JWT错误: {}", e))
            }
            AuthError::DatabaseError(e) => {
                ApiErrorResponse::custom(business::login::INVALID_CREDENTIALS, format!("数据库错误: {}", e))
            }
        }
    }
}

pub struct AuthService;

impl AuthService {

    /// 用户登录
    pub async fn signin(
        db: &database::Storage,
        req: SigninRequest,
        config: &Configure,
    ) -> Result<SigninResponse, AuthError> {
        // 查找用户
        let user = db
            .auth()
            .find_one(doc! {"username": &req.username})
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?
            .ok_or(AuthError::UserNotFound)?;

        // 验证密码
        let is_valid = verify_password(
            &req.password,
            &user.password,
            &config.encryption,
            config.aes_key.as_deref(),
        )?;

        if !is_valid {
            return Err(AuthError::InvalidPassword);
        }

        // 生成 JWT token
        let user_id = user
            .id
            .ok_or_else(|| AuthError::DatabaseError("User ID is missing".to_string()))?
            .to_hex();
        let token = generate_token(&user_id, &user.username, &config.jwt_secret, None)?;

        Ok(SigninResponse {
            token,
            user: user.into(),
        })
    }


    /// 用户注册
    pub async fn signup(
        db: &database::Storage,
        req: SignupRequest,
        config: &Configure,
    ) -> Result<SignupResponse, AuthError> {
        // 检查用户名是否已存在
        let existing = db
            .auth()
            .find_one(doc! {"username": &req.username})
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        if existing.is_some() {
            return Err(AuthError::UserAlreadyExists);
        }

        // 加密密码
        let encrypted_password = encrypt_password(
            &req.password,
            &config.encryption,
            config.aes_key.as_deref(),
        )?;

        // 创建用户
        let now = DateTime::now().timestamp_millis();
        let user = AuthUser {
            id: None,
            username: req.username.clone(),
            password: encrypted_password,
            created_at: mongodb::bson::DateTime::from_millis(now),
            updated_at: mongodb::bson::DateTime::from_millis(now),
        };

        // 保存到数据库
        let result = db
            .auth()
            .insert_one(&user)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        // 获取插入的用户 ID
        let inserted_id = result
            .inserted_id
            .as_object_id()
            .ok_or_else(|| AuthError::DatabaseError("Failed to get inserted ID".to_string()))?;

        let user_id = inserted_id.to_hex();

        // 生成 JWT token
        let token = generate_token(&user_id, &user.username, &config.jwt_secret, None)?;

        // 更新 user 对象，设置 id
        let mut user_with_id = user;
        user_with_id.id = Some(inserted_id);

        Ok(SignupResponse {
            token,
            user: user_with_id.into(),
        })
    }


}
