use chrono::{Datelike, Utc};
use entity::{asset, auth};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::clients::redis::RedisPool;
use crate::configures::configure::Configure;
use crate::databases::database::{self, Storage};
use crate::filters::exception::Exception;
use crate::guards::blacklist;
use crate::services::auth::schema::{
    Gender, ProfileP, ProfileR, Role, SigninP, SigninR, SignupP, SignupR, Status,
};
use crate::utils::code::{auth as auth_codes, business, external, request, resource, system};
use crate::utils::db::is_unique_violation;
use crate::utils::encryption::{EncryptionError, encrypt_password, verify_password};
use crate::utils::jwt::{JwtError, generate_token};

#[derive(Debug, thiserror::Error)]
pub enum ProfileError {
    #[error("Phone already exists")]
    PhoneTaken,
    #[error("Avatar not found")]
    AvatarMissing,
    #[error("Avatar access denied")]
    AvatarDenied,
    #[error("Invalid parameter: {0}")]
    BadParam(String),
    #[error("Database error: {0}")]
    Db(String),
}

impl From<ProfileError> for Exception {
    fn from(err: ProfileError) -> Self {
        match err {
            ProfileError::PhoneTaken => {
                Exception::custom(business::user::PHONE_EXISTS, "手机号已被注册")
            }
            ProfileError::AvatarMissing => {
                Exception::custom(business::upload::FILE_NOT_FOUND, "文件不存在")
            }
            ProfileError::AvatarDenied => {
                Exception::custom(resource::ACCESS_RESTRICTED, "资源访问被限制")
            }
            ProfileError::BadParam(msg) => Exception::custom(request::INVALID_PARAMETER_VALUE, msg),
            ProfileError::Db(msg) => {
                tracing::error!(error = %msg, "profile database error");
                Exception::custom(external::DATABASE_ERROR, "数据库错误")
            }
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("User already exists")]
    UserAlreadyExists,
    #[error("User not found")]
    UserNotFound,
    #[error("Invalid password")]
    InvalidPassword,
    #[error("Account disabled")]
    AccountDisabled,
    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),
    #[error(transparent)]
    Profile(#[from] ProfileError),
    #[error("Encryption error: {0}")]
    EncryptionError(#[from] EncryptionError),
    #[error("JWT error: {0}")]
    JwtError(#[from] JwtError),
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Cache error: {0}")]
    CacheError(String),
}

impl From<AuthError> for Exception {
    fn from(err: AuthError) -> Self {
        match err {
            AuthError::UserAlreadyExists => {
                Exception::custom(business::user::USERNAME_EXISTS, "用户名已存在")
            }
            AuthError::UserNotFound => Exception::custom(business::user::NOT_FOUND, "用户不存在"),
            AuthError::InvalidPassword => {
                Exception::custom(business::login::INVALID_CREDENTIALS, "用户名或密码错误")
            }
            AuthError::AccountDisabled => {
                Exception::custom(auth_codes::ACCOUNT_DISABLED, "账号已禁用")
            }
            AuthError::InvalidParameter(msg) => {
                Exception::custom(request::INVALID_PARAMETER_VALUE, msg)
            }
            AuthError::Profile(e) => Exception::from(e),
            AuthError::EncryptionError(_) => {
                Exception::custom(system::INTERNAL_ERROR, "加密服务异常")
            }
            AuthError::JwtError(_) => Exception::custom(system::INTERNAL_ERROR, "令牌服务异常"),
            AuthError::DatabaseError(msg) => {
                tracing::error!(error = %msg, "auth database error");
                Exception::custom(external::DATABASE_ERROR, "数据库错误")
            }
            AuthError::CacheError(msg) => {
                tracing::error!(error = %msg, "auth cache error");
                Exception::custom(external::CACHE_ERROR, "缓存错误")
            }
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

pub fn age_from_birthday(birthday: chrono::NaiveDate) -> i32 {
    let today = Utc::now().date_naive();
    let mut age = today.year() - birthday.year();
    if (today.month(), today.day()) < (birthday.month(), birthday.day()) {
        age -= 1;
    }
    age.max(0)
}

pub async fn load_avatar(
    db: &Storage,
    avatar_id: Option<Uuid>,
) -> Result<Option<asset::Model>, ProfileError> {
    let Some(id) = avatar_id else {
        return Ok(None);
    };
    asset::Entity::find_by_id(id)
        .one(&db.db)
        .await
        .map_err(|e| ProfileError::Db(e.to_string()))
}

pub async fn phone_free(
    db: &Storage,
    phone: &str,
    exclude_id: Option<Uuid>,
) -> Result<(), ProfileError> {
    let existing = auth::Entity::find()
        .filter(auth::Column::Phone.eq(phone))
        .one(&db.db)
        .await
        .map_err(|e| ProfileError::Db(e.to_string()))?;

    if let Some(user) = existing {
        if exclude_id != Some(user.id) {
            return Err(ProfileError::PhoneTaken);
        }
    }

    Ok(())
}

pub async fn check_avatar(
    db: &Storage,
    user_id: Uuid,
    asset_id: &str,
) -> Result<Uuid, ProfileError> {
    let id = Uuid::parse_str(asset_id)
        .map_err(|_| ProfileError::BadParam("头像资源 ID 无效".to_string()))?;

    let asset = asset::Entity::find_by_id(id)
        .one(&db.db)
        .await
        .map_err(|e| ProfileError::Db(e.to_string()))?
        .ok_or(ProfileError::AvatarMissing)?;

    if asset.status != "COMPLETED" {
        return Err(ProfileError::AvatarMissing);
    }

    if asset.creator != Some(user_id) {
        return Err(ProfileError::AvatarDenied);
    }

    if !asset.mime.starts_with("image/") {
        return Err(ProfileError::BadParam("头像文件必须是图片类型".to_string()));
    }

    Ok(id)
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

        if Status::parse(&user.status).unwrap_or(Status::Disabled) != Status::Active {
            return Err(AuthError::AccountDisabled);
        }

        let role = Role::parse(&user.role).unwrap_or(Role::User);
        let token = generate_token(
            &user.id.to_string(),
            &user.username,
            role,
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
            role: Set(Role::User.as_str().to_string()),
            status: Set(Status::Active.as_str().to_string()),
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
            Role::User,
            &config.jwt_secret,
            None,
        )?;

        Ok(SignupR {
            token,
            auth: user.into(),
        })
    }

    pub async fn toRead(db: &database::Storage, user_id: &str) -> Result<ProfileR, AuthError> {
        let user = Self::find_user(db, user_id).await?;
        let avatar = load_avatar(db, user.avatar).await?;
        Ok(ProfileR::from_user(user, avatar))
    }

    pub async fn signout(redis: &RedisPool, token: &str, exp: i64) -> Result<(), AuthError> {
        let now = Utc::now().timestamp();
        let ttl = (exp - now).max(1);
        blacklist::add(redis, token, ttl)
            .await
            .map_err(|e| AuthError::CacheError(e.to_string()))
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
            phone_free(db, phone, Some(id)).await?;
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
            Some(ProfileP::parse_birthday(value).ok_or_else(|| {
                AuthError::InvalidParameter("生日格式无效，应为 YYYY-MM-DD".to_string())
            })?)
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
                Some(asset_id) => Some(check_avatar(db, id, &asset_id).await?),
                None => None,
            };
            active.avatar = Set(avatar);
        }

        let now = Utc::now().fixed_offset();
        active.updated_at = Set(now);
        active.updater = Set(Some(id));

        let updated = active.update(&db.db).await.map_err(|err| {
            if is_unique_violation(&err) {
                AuthError::Profile(ProfileError::PhoneTaken)
            } else {
                AuthError::DatabaseError(err.to_string())
            }
        })?;

        let avatar_model = load_avatar(db, updated.avatar).await?;
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
}
