use chrono::NaiveDate;
use entity::{asset, auth};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub use crate::guards::permission::{Role, Status};

const ASSET_URL_PREFIX: &str = "/api/v1/upload/asset";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Gender {
    Male,
    Female,
}

impl Gender {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Male => "MALE",
            Self::Female => "FEMALE",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "MALE" => Some(Self::Male),
            "FEMALE" => Some(Self::Female),
            _ => None,
        }
    }
}

#[derive(Debug, Serialize, Clone, ToSchema)]
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
            url: format!("{ASSET_URL_PREFIX}/{}", asset.id),
            mime: asset.mime,
            name: asset.name,
        }
    }
}

#[derive(Debug, Serialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AuthR {
    pub id: String,
    pub username: String,
    pub role: String,
    pub status: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

impl From<auth::Model> for AuthR {
    fn from(user: auth::Model) -> Self {
        AuthR {
            id: user.id.to_string(),
            username: user.username,
            role: user.role,
            status: user.status,
            created_at: user.created_at.timestamp_millis(),
            updated_at: user.updated_at.timestamp_millis(),
        }
    }
}

#[derive(Debug, Serialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProfileR {
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
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

impl ProfileR {
    pub fn from_user(user: auth::Model, avatar: Option<asset::Model>) -> Self {
        Self {
            id: user.id.to_string(),
            username: user.username,
            role: user.role,
            status: user.status,
            email: user.email,
            phone: user.phone,
            gender: user.gender,
            birthday: user.birthday.map(|d| d.to_string()),
            age: user.age.map(|v| v as u32),
            avatar: avatar.map(Avatar::from),
            created_at: user.created_at.timestamp_millis(),
            updated_at: user.updated_at.timestamp_millis(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct SigninP {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct SignupP {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProfileP {
    pub email: Option<String>,
    pub phone: Option<String>,
    pub gender: Option<String>,
    pub birthday: Option<String>,
    pub avatar: Option<Option<String>>,
}

impl ProfileP {
    pub fn parse_birthday(value: &str) -> Option<NaiveDate> {
        NaiveDate::parse_from_str(value, "%Y-%m-%d").ok()
    }
}

#[derive(Debug, Serialize, Clone, ToSchema)]
pub struct SigninR {
    pub token: String,
    #[serde(flatten)]
    pub auth: AuthR,
}

#[derive(Debug, Serialize, Clone, ToSchema)]
pub struct SignupR {
    pub token: String,
    #[serde(flatten)]
    pub auth: AuthR,
}

#[cfg(test)]
mod tests {
    use super::{Gender, ProfileP, Role, Status};

    #[test]
    fn gender_roundtrip() {
        assert_eq!(Gender::parse("MALE"), Some(Gender::Male));
        assert_eq!(Gender::parse("FEMALE"), Some(Gender::Female));
        assert_eq!(Gender::Male.as_str(), "MALE");
        assert_eq!(Gender::Female.as_str(), "FEMALE");
        assert_eq!(Gender::parse("OTHER"), None);
        assert_eq!(Gender::parse("invalid"), None);
    }

    #[test]
    fn birthday_parse() {
        let date = ProfileP::parse_birthday("1990-01-01");
        assert!(date.is_some());
        assert_eq!(date.unwrap().format("%Y-%m-%d").to_string(), "1990-01-01");
    }

    #[test]
    fn role_status_defaults() {
        assert_eq!(Role::default().as_str(), "USER");
        assert_eq!(Status::default().as_str(), "ACTIVE");
    }
}
