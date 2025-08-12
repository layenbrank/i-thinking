use crate::utils::datetime_serde::{deserialize_datetime, serialize_datetime};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<mongodb::bson::oid::ObjectId>,
    pub username: String,
    pub password: String,
    pub email: Option<String>,
    pub age: Option<u32>,
    #[serde(
        serialize_with = "serialize_datetime",
        deserialize_with = "deserialize_datetime"
    )]
    pub created_at: mongodb::bson::DateTime,
    #[serde(
        serialize_with = "serialize_datetime",
        deserialize_with = "deserialize_datetime"
    )]
    pub updated_at: mongodb::bson::DateTime,
    // pub role: Option<String>,
}

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
    #[serde(
        serialize_with = "serialize_datetime",
        deserialize_with = "deserialize_datetime"
    )]
    pub updated_at: mongodb::bson::DateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserResponse {
    pub id: String,
    pub username: String,
    pub email: Option<String>,
    pub age: Option<u32>,
    #[serde(
        serialize_with = "serialize_datetime",
        deserialize_with = "deserialize_datetime"
    )]
    pub created_at: mongodb::bson::DateTime,
    #[serde(
        serialize_with = "serialize_datetime",
        deserialize_with = "deserialize_datetime"
    )]
    pub updated_at: mongodb::bson::DateTime,
}

impl From<User> for UserResponse {
    fn from(value: User) -> Self {
        UserResponse {
            id: value.id.unwrap().to_hex(),
            username: value.username,
            email: value.email,
            age: value.age,
            created_at: value.created_at,
            updated_at: value.updated_at,
        }
    }
}
