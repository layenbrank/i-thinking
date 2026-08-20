use chrono::{DateTime, Utc};
use entity::{asset, auth};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::utils::timestamp::{from_ts, to_ts};

/// 后台管理员创建用户
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct WriteP {
    pub username: String,
    pub password: String,
    /// USER / ADMIN，默认 USER
    pub role: Option<String>,
}

/// 后台管理员更新用户（账号/密码/资料运维）
/// 用户自助修改个人信息请使用 PUT /api/v1/auth/profile
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateP {
    pub username: Option<String>,
    pub password: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub gender: Option<String>,
    pub birthday: Option<String>,
    pub age: Option<u32>,
    pub avatar: Option<Option<String>>,
    pub role: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Avatar {
    pub id: String,
    pub url: String,
    pub mime: String,
    pub name: String,
}

impl From<asset::Model> for Avatar {
    fn from(asset: asset::Model) -> Self {
        Self {
            id: asset.id.to_string(),
            url: format!("/api/v1/upload/files/{}", asset.hash),
            mime: asset.mime,
            name: asset.name,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UserR {
    pub id: String,
    pub username: String,
    pub role: String,
    pub status: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub gender: Option<String>,
    pub birthday: Option<String>,
    pub age: Option<u32>,
    pub avatar: Option<Avatar>,
    #[serde(serialize_with = "to_ts", deserialize_with = "from_ts")]
    #[schema(value_type = i64, example = 1700000000000_i64)]
    pub created_at: DateTime<Utc>,
    #[serde(serialize_with = "to_ts", deserialize_with = "from_ts")]
    #[schema(value_type = i64, example = 1700000000000_i64)]
    pub updated_at: DateTime<Utc>,
}

impl UserR {
    pub fn from_parts(value: auth::Model, avatar: Option<asset::Model>) -> Self {
        UserR {
            id: value.id.to_string(),
            username: value.username,
            role: value.role,
            status: value.status,
            email: value.email,
            phone: value.phone,
            gender: value.gender,
            birthday: value.birthday.map(|d| d.to_string()),
            age: value.age.map(|v| v as u32),
            avatar: avatar.map(Avatar::from),
            created_at: value.created_at.with_timezone(&Utc),
            updated_at: value.updated_at.with_timezone(&Utc),
        }
    }
}
