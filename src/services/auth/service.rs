use crate::configures::configure::Configure;
use crate::databases::database;
use crate::services::auth::schema::{
    Gender, ProfileR, SigninP, SigninR, SignupP, SignupR, ProfileP,
};
use crate::utils::db::is_unique_violation;
use crate::utils::encryption::{EncryptionError, encrypt_password, verify_password};
use crate::utils::jwt::{JwtError, generate_token};
use crate::utils::response::{ErrorBody, business, external, request, resource, system};
use chrono::{Datelike, Utc};
use entity::{asset, auth};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("User already exists")]
    UserAlreadyExists,
    #[error("User not found")]
    UserNotFound,
    #[error("Invalid password")]
    InvalidPassword,
    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),
    #[error("Phone already exists")]
    PhoneAlreadyExists,
    #[error("Avatar not found")]
    AvatarNotFound,
    #[error("Avatar access denied")]
    AvatarAccessDenied,
    #[error("Encryption error: {0}")]
    EncryptionError(#[from] EncryptionError),
    #[error("JWT error: {0}")]
    JwtError(#[from] JwtError),
    #[error("Database error: {0}")]
    DatabaseError(String),
}

impl From<AuthError> for ErrorBody {
    fn from(err: AuthError) -> Self {
        match err {
            AuthError::UserAlreadyExists => {
                ErrorBody::custom(business::user::USERNAME_EXISTS, "用户名已存在")
            }
            AuthError::UserNotFound => {
                ErrorBody::custom(business::user::NOT_FOUND, "用户不存在")
            }
            AuthError::InvalidPassword => {
                ErrorBody::custom(business::login::INVALID_CREDENTIALS, "用户名或密码错误")
            }
            AuthError::InvalidParameter(msg) => {
                ErrorBody::custom(request::INVALID_PARAMETER_VALUE, msg)
            }
            AuthError::PhoneAlreadyExists => {
                ErrorBody::custom(business::user::PHONE_EXISTS, "手机号已被注册")
            }
            AuthError::AvatarNotFound => {
                ErrorBody::custom(business::upload::FILE_NOT_FOUND, "文件不存在")
            }
            AuthError::AvatarAccessDenied => {
                ErrorBody::custom(resource::ACCESS_RESTRICTED, "资源访问被限制")
            }
            AuthError::EncryptionError(e) => ErrorBody::custom(
                system::INTERNAL_ERROR,
                format!("加密错误: {}", e),
            ),
            AuthError::JwtError(e) => ErrorBody::custom(
                system::INTERNAL_ERROR,
                format!("JWT错误: {}", e),
            ),
            AuthError::DatabaseError(e) => ErrorBody::custom(
                external::DATABASE_ERROR,
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

fn age_from_birthday(birthday: chrono::NaiveDate) -> i32 {
    let today = Utc::now().date_naive();
    let mut age = today.year() - birthday.year();
    if (today.month(), today.day()) < (birthday.month(), birthday.day()) {
        age -= 1;
    }
    age.max(0)
}

pub struct AuthService;

impl AuthService {
    pub async fn signin(
        db: &database::Storage,
        req: SigninP,
        config: &Configure,
    ) -> Result<SigninR, AuthError> {
        let user = auth::Entity::find_by_username(&req.username)
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

        Ok(SigninR {
            token,
            auth: user.into(),
        })
    }

    pub async fn signup(
        db: &database::Storage,
        req: SignupP,
        config: &Configure,
    ) -> Result<SignupR, AuthError> {
        let existing = auth::Entity::find_by_username(&req.username)
            .one(&db.db)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        if existing.is_some() {
            return Err(AuthError::UserAlreadyExists);
        }

        let encrypted_password =
            encrypt_password(&req.password, &config.encryption, config.aes_key.as_deref())?;

        let now = Utc::now().fixed_offset();
        let user = auth::ActiveModel {
            id: Set(Uuid::new_v4()),
            username: Set(req.username),
            password: Set(encrypted_password),
            email: Set(None),
            phone: Set(None),
            age: Set(None),
            gender: Set(None),
            birthday: Set(None),
            avatar: Set(None),
            archived_at: Set(None),
            created_at: Set(now),
            creator: Set(None),
            updated_at: Set(now),
            updater: Set(None),
            expires_at: Set(None),
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

        Ok(SignupR {
            token,
            auth: user.into(),
        })
    }

    pub async fn toRead(
        db: &database::Storage,
        user_id: &str,
    ) -> Result<ProfileR, AuthError> {
        let user = Self::find_user(db, user_id).await?;
        let avatar = Self::load_avatar(db, user.avatar).await?;
        Ok(ProfileR::from_user(user, avatar))
    }

    pub async fn toUpdate(
        db: &database::Storage,
        user_id: &str,
        req: ProfileP,
    ) -> Result<ProfileR, AuthError> {
        let id = Uuid::parse_str(user_id)
            .map_err(|_| AuthError::InvalidParameter("用户 ID 无效".to_string()))?;
        let user = Self::find_user(db, user_id).await?;

        if let Some(phone) = req.phone.as_ref() {
            Self::ensure_phone_available(db, phone, Some(id)).await?;
        }

        let gender = if let Some(value) = req.gender.as_ref() {
            Some(
                Gender::parse(value)
                    .ok_or_else(|| AuthError::InvalidParameter("性别参数无效".to_string()))?
                    .as_str()
                    .to_string(),
            )
        } else {
            None
        };

        let birthday = if let Some(value) = req.birthday.as_ref() {
            Some(
                ProfileP::parse_birthday(value).ok_or_else(|| {
                    AuthError::InvalidParameter("生日格式无效，应为 YYYY-MM-DD".to_string())
                })?,
            )
        } else {
            None
        };

        let mut active: auth::ActiveModel = user.into();
        if let Some(email) = req.email {
            active.email = Set(Some(email));
        }
        if req.phone.is_some() {
            active.phone = Set(req.phone);
        }
        if gender.is_some() {
            active.gender = Set(gender);
        }
        if let Some(date) = birthday {
            active.birthday = Set(Some(date));
            active.age = Set(Some(age_from_birthday(date)));
        }
        if let Some(value) = req.avatar {
            let avatar = match value {
                Some(asset_id) => Some(Self::validate_avatar_asset(db, id, &asset_id).await?),
                None => None,
            };
            active.avatar = Set(avatar);
        }

        let now = Utc::now().fixed_offset();
        active.updated_at = Set(now);
        active.updater = Set(Some(id));

        let updated = active.update(&db.db).await.map_err(|err| {
            if is_unique_violation(&err) {
                AuthError::PhoneAlreadyExists
            } else {
                AuthError::DatabaseError(err.to_string())
            }
        })?;

        let avatar_model = Self::load_avatar(db, updated.avatar).await?;
        Ok(ProfileR::from_user(updated, avatar_model))
    }

    async fn find_user(db: &database::Storage, user_id: &str) -> Result<auth::Model, AuthError> {
        let id = Uuid::parse_str(user_id)
            .map_err(|_| AuthError::InvalidParameter("用户 ID 无效".to_string()))?;
        auth::Entity::find_by_id(id)
            .one(&db.db)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?
            .ok_or(AuthError::UserNotFound)
    }

    async fn load_avatar(
        db: &database::Storage,
        avatar_id: Option<Uuid>,
    ) -> Result<Option<asset::Model>, AuthError> {
        let Some(id) = avatar_id else {
            return Ok(None);
        };
        asset::Entity::find_by_id(id)
            .one(&db.db)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))
    }

    async fn ensure_phone_available(
        db: &database::Storage,
        phone: &str,
        exclude_id: Option<Uuid>,
    ) -> Result<(), AuthError> {
        let existing = auth::Entity::find()
            .filter(auth::Column::Phone.eq(phone))
            .one(&db.db)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        if let Some(user) = existing {
            if exclude_id != Some(user.id) {
                return Err(AuthError::PhoneAlreadyExists);
            }
        }

        Ok(())
    }

    async fn validate_avatar_asset(
        db: &database::Storage,
        user_id: Uuid,
        asset_id: &str,
    ) -> Result<Uuid, AuthError> {
        let id = Uuid::parse_str(asset_id)
            .map_err(|_| AuthError::InvalidParameter("头像资源 ID 无效".to_string()))?;

        let asset = asset::Entity::find_by_id(id)
            .one(&db.db)
            .await
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?
            .ok_or(AuthError::AvatarNotFound)?;

        if asset.status != "COMPLETED" {
            return Err(AuthError::AvatarNotFound);
        }

        if asset.creator != Some(user_id) {
            return Err(AuthError::AvatarAccessDenied);
        }

        if !asset.mime.starts_with("image/") {
            return Err(AuthError::InvalidParameter(
                "头像文件必须是图片类型".to_string(),
            ));
        }

        Ok(id)
    }
}
