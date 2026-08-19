use crate::{
    configures::configure::Configure,
    databases::database::Storage,
    services::{
        auth::schema::{Gender, ProfileP},
        user::schema::{UpdateP, WriteP, UserR},
    },
    utils::{
        db::is_unique_violation,
        encryption::{EncryptionError, encrypt_password},
        response::{ErrorBody, business, request, resource},
    },
};
use chrono::{Datelike, Utc};
use entity::{asset, auth};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum UserError {
    #[error("User already exists")]
    UserAlreadyExists,
    #[error("User not found")]
    UserNotFound,
    #[error("Invalid user ID")]
    InvalidId,
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
    #[error("Database error: {0}")]
    DatabaseError(String),
}

impl From<UserError> for ErrorBody {
    fn from(err: UserError) -> Self {
        match err {
            UserError::UserAlreadyExists => {
                ErrorBody::custom(business::user::USERNAME_EXISTS, "用户名已存在")
            }
            UserError::UserNotFound => {
                ErrorBody::custom(business::user::NOT_FOUND, "用户不存在")
            }
            UserError::InvalidId => {
                ErrorBody::custom(request::INVALID_PARAMETER_VALUE, "用户 ID 无效")
            }
            UserError::InvalidParameter(msg) => {
                ErrorBody::custom(request::INVALID_PARAMETER_VALUE, msg)
            }
            UserError::PhoneAlreadyExists => {
                ErrorBody::custom(business::user::PHONE_EXISTS, "手机号已被注册")
            }
            UserError::AvatarNotFound => {
                ErrorBody::custom(business::upload::FILE_NOT_FOUND, "文件不存在")
            }
            UserError::AvatarAccessDenied => {
                ErrorBody::custom(resource::ACCESS_RESTRICTED, "资源访问被限制")
            }
            UserError::EncryptionError(e) => {
                ErrorBody::internal_error(format!("加密错误: {e}"))
            }
            UserError::DatabaseError(e) => {
                ErrorBody::internal_error(format!("数据库错误: {e}"))
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

fn age_from_birthday(birthday: chrono::NaiveDate) -> i32 {
    let today = Utc::now().date_naive();
    let mut age = today.year() - birthday.year();
    if (today.month(), today.day()) < (birthday.month(), birthday.day()) {
        age -= 1;
    }
    age.max(0)
}

pub enum ReadR {
    One(UserR),
    Many(Vec<UserR>),
}

pub struct UserService;

impl UserService {
    pub async fn toWrite(
        db: &Storage,
        config: &Configure,
        req: WriteP,
    ) -> Result<UserR, UserError> {
        if auth::Entity::find_by_username(&req.username)
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
        let user = auth::ActiveModel {
            id: Set(Uuid::new_v4()),
            username: Set(req.username),
            password: Set(password),
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

        Ok(UserR::from_parts(user, None))
    }

    pub async fn toRead(db: &Storage, id: Option<&str>) -> Result<ReadR, UserError> {
        match id {
            Some(id) => {
                let user = Self::find_model(db, id).await?;
                let avatar = Self::load_avatar(db, user.avatar).await?;
                Ok(ReadR::One(UserR::from_parts(user, avatar)))
            }
            None => {
                let users = auth::Entity::find()
                    .all(&db.db)
                    .await
                    .map_err(|e| UserError::DatabaseError(e.to_string()))?;

                let mut result = Vec::with_capacity(users.len());
                for user in users {
                    let avatar = Self::load_avatar(db, user.avatar).await?;
                    result.push(UserR::from_parts(user, avatar));
                }
                Ok(ReadR::Many(result))
            }
        }
    }

    pub async fn toUpdate(
        db: &Storage,
        config: &Configure,
        id: &str,
        req: UpdateP,
    ) -> Result<UserR, UserError> {
        let user_id = Uuid::parse_str(id).map_err(|_| UserError::InvalidId)?;
        let model = Self::find_model(db, id).await?;

        if let Some(phone) = req.phone.as_ref() {
            Self::ensure_phone_available(db, phone, Some(user_id)).await?;
        }

        let gender = if let Some(value) = req.gender.as_ref() {
            Some(
                Gender::parse(value)
                    .ok_or_else(|| UserError::InvalidParameter("性别参数无效".to_string()))?
                    .as_str()
                    .to_string(),
            )
        } else {
            None
        };

        let birthday = if let Some(value) = req.birthday.as_ref() {
            Some(
                ProfileP::parse_birthday(value).ok_or_else(|| {
                    UserError::InvalidParameter("生日格式无效，应为 YYYY-MM-DD".to_string())
                })?,
            )
        } else {
            None
        };

        let mut active: auth::ActiveModel = model.into();
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
        if let Some(age) = req.age {
            active.age = Set(Some(age as i32));
        }
        if let Some(value) = req.avatar {
            let avatar = match value {
                Some(asset_id) => Some(Self::validate_avatar_asset(db, user_id, &asset_id).await?),
                None => None,
            };
            active.avatar = Set(avatar);
        }
        active.updated_at = Set(Utc::now().fixed_offset());

        let updated = active.update(&db.db).await.map_err(|err| {
            if is_unique_violation(&err) {
                UserError::PhoneAlreadyExists
            } else {
                UserError::DatabaseError(err.to_string())
            }
        })?;

        let avatar_model = Self::load_avatar(db, updated.avatar).await?;
        Ok(UserR::from_parts(updated, avatar_model))
    }

    pub async fn toRemove(db: &Storage, id: &str) -> Result<(), UserError> {
        let id = Uuid::parse_str(id).map_err(|_| UserError::InvalidId)?;
        let result = auth::Entity::delete_by_id(id)
            .exec(&db.db)
            .await
            .map_err(|e| UserError::DatabaseError(e.to_string()))?;

        if result.rows_affected == 0 {
            return Err(UserError::UserNotFound);
        }

        Ok(())
    }

    async fn find_model(db: &Storage, id: &str) -> Result<auth::Model, UserError> {
        let id = Uuid::parse_str(id).map_err(|_| UserError::InvalidId)?;
        auth::Entity::find_by_id(id)
            .one(&db.db)
            .await
            .map_err(|e| UserError::DatabaseError(e.to_string()))?
            .ok_or(UserError::UserNotFound)
    }

    async fn load_avatar(
        db: &Storage,
        avatar_id: Option<Uuid>,
    ) -> Result<Option<asset::Model>, UserError> {
        let Some(id) = avatar_id else {
            return Ok(None);
        };
        asset::Entity::find_by_id(id)
            .one(&db.db)
            .await
            .map_err(|e| UserError::DatabaseError(e.to_string()))
    }

    async fn ensure_phone_available(
        db: &Storage,
        phone: &str,
        exclude_id: Option<Uuid>,
    ) -> Result<(), UserError> {
        let existing = auth::Entity::find()
            .filter(auth::Column::Phone.eq(phone))
            .one(&db.db)
            .await
            .map_err(|e| UserError::DatabaseError(e.to_string()))?;

        if let Some(user) = existing {
            if exclude_id != Some(user.id) {
                return Err(UserError::PhoneAlreadyExists);
            }
        }

        Ok(())
    }

    async fn validate_avatar_asset(
        db: &Storage,
        user_id: Uuid,
        asset_id: &str,
    ) -> Result<Uuid, UserError> {
        let id = Uuid::parse_str(asset_id)
            .map_err(|_| UserError::InvalidParameter("头像资源 ID 无效".to_string()))?;

        let asset = asset::Entity::find_by_id(id)
            .one(&db.db)
            .await
            .map_err(|e| UserError::DatabaseError(e.to_string()))?
            .ok_or(UserError::AvatarNotFound)?;

        if asset.status != "COMPLETED" {
            return Err(UserError::AvatarNotFound);
        }

        if asset.creator != Some(user_id) {
            return Err(UserError::AvatarAccessDenied);
        }

        if !asset.mime.starts_with("image/") {
            return Err(UserError::InvalidParameter(
                "头像文件必须是图片类型".to_string(),
            ));
        }

        Ok(id)
    }
}
