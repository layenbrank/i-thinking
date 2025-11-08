use crate::utils::timestamp::from_ts;
use mongodb::bson::{DateTime, doc, oid::ObjectId};
use serde::{Deserialize, Serialize};

/// 用于数据库存储的 AuthUser 结构体（包含所有字段）
/// 注意：MongoDB 中存储的字段名使用 camelCase（createdAt, updatedAt）
/// 但 password 字段名保持不变
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AuthUser {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    pub username: String,
    pub password: String,

    #[serde(deserialize_with = "from_ts")]
    pub created_at: DateTime,
    #[serde(deserialize_with = "from_ts")]
    pub updated_at: DateTime,
}

/// 用于 API 响应的用户信息结构体（不包含 password）
#[derive(Debug, Serialize, Clone)]
pub struct AuthUserResponse {
    pub id: Option<String>,
    pub username: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

impl From<AuthUser> for AuthUserResponse {
    fn from(user: AuthUser) -> Self {
        AuthUserResponse {
            id: user.id.map(|id| id.to_hex()),
            username: user.username,
            created_at: user.created_at.timestamp_millis(),
            updated_at: user.updated_at.timestamp_millis(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SigninRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SignupRequest {
    pub username: String,
    pub password: String,
}

/// 扁平化的登录响应结构
#[derive(Debug, Serialize, Clone)]
pub struct SigninResponse {
    pub token: String,
    #[serde(flatten)]
    pub user: AuthUserResponse,
}

/// 扁平化的注册响应结构
#[derive(Debug, Serialize, Clone)]
pub struct SignupResponse {
    pub token: String,
    #[serde(flatten)]
    pub user: AuthUserResponse,
}
