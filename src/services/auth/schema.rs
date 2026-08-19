use entity::users;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Clone)]
pub struct AuthUserResponse {
    pub id: String,
    pub username: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

impl From<users::Model> for AuthUserResponse {
    fn from(user: users::Model) -> Self {
        AuthUserResponse {
            id: user.id.to_string(),
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

#[derive(Debug, Serialize, Clone)]
pub struct SigninResponse {
    pub token: String,
    #[serde(flatten)]
    pub user: AuthUserResponse,
}

#[derive(Debug, Serialize, Clone)]
pub struct SignupResponse {
    pub token: String,
    #[serde(flatten)]
    pub user: AuthUserResponse,
}
