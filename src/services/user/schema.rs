use crate::utils::timestamp::{from_ts, to_ts};
use chrono::{DateTime, Utc};
use entity::users;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreateUser {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUser {
    pub username: Option<String>,
    pub password: Option<String>,
    pub email: Option<String>,
    pub age: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserResponse {
    pub id: String,
    pub username: String,
    pub email: Option<String>,
    pub age: Option<u32>,
    #[serde(serialize_with = "to_ts", deserialize_with = "from_ts")]
    pub created_at: DateTime<Utc>,
    #[serde(serialize_with = "to_ts", deserialize_with = "from_ts")]
    pub updated_at: DateTime<Utc>,
}

impl From<users::Model> for UserResponse {
    fn from(value: users::Model) -> Self {
        UserResponse {
            id: value.id.to_string(),
            username: value.username,
            email: value.email,
            age: value.age.map(|v| v as u32),
            created_at: value.created_at.with_timezone(&Utc),
            updated_at: value.updated_at.with_timezone(&Utc),
        }
    }
}
