use crate::{
    services::application::schema::{Component, Direction, Schema, Shape, Size},
    utils::response::ApiErrorResponse,
};
use actix_web::Result;
use mongodb::bson::datetime::DateTime;

pub struct Service;

#[derive(Debug, thiserror::Error)]
pub enum ApplicationError {
    #[error("HTTP error {status}: {message}")]
    HttpStatusError { status: u16, message: String },
    #[error("Invalid response format: {0}")]
    InvalidResponseFormat(String),
}

impl From<ApplicationError> for ApiErrorResponse {
    fn from(err: ApplicationError) -> Self {
        use crate::utils::response::data;
        match err {
            ApplicationError::HttpStatusError { status, message } => ApiErrorResponse::custom(
                data::DATA_INCONSISTENCY,
                format!("HTTP错误 {}: {}", status, message),
            ),
            ApplicationError::InvalidResponseFormat(msg) => {
                ApiErrorResponse::custom(data::DATA_INCONSISTENCY, format!("响应格式错误: {}", msg))
            }
        }
    }
}

impl Service {
    pub async fn toRead() -> Result<Schema, ApplicationError> {
        // storage.application().find_one(None, None)?;
        let now = DateTime::now().timestamp_millis();

        Ok(Schema {
            id: String::from("1234567890"),
            index: 1,
            name: String::from("测试应用"),
            url: Some(String::from("https://api.example.com")),
            size: Size::Mini,
            width: Some(String::from("60px")),
            round: Some(String::from("12px")),
            shape: Shape::Square,
            height: Some(String::from("60px")),
            marker: None,
            mirror_id: String::from("0"),
            text_size: Some(String::from("12px")),
            updated_at: now,
            created_at: now,
            text_color: Some(String::from("#4080ff")),
            component: Component::Bookmark,
            direction: Direction::Horizontal,
            description: String::from("测试描述"),
            collection_id: None,
            download_count: 0,
            background_color: None,
            background_image: None,
        })
    }

    pub async fn toInsert() -> Result<Schema> {
        let now = DateTime::now().timestamp_millis();

        Ok(Schema {
            id: String::from("1234567890"),
            index: 1,
            name: String::from("测试应用"),
            url: Some(String::from("http://api.example.com")),
            size: Size::Mini,
            width: Some(String::from("60px")),
            round: Some(String::from("12px")),
            shape: Shape::Square,
            height: Some(String::from("60px")),
            marker: None,
            mirror_id: String::from("0"),
            text_size: Some(String::from("12px")),
            updated_at: now,
            created_at: now,
            text_color: Some(String::from("#4080ff")),
            component: Component::Bookmark,
            direction: Direction::Horizontal,
            description: String::from("测试描述"),
            collection_id: None,
            download_count: 0,
            background_color: None,
            background_image: None,
        })
    }
    pub fn toUpdate() -> Result<Schema> {
        let now = DateTime::now().timestamp_millis();

        Ok(Schema {
            id: String::from("1234567890"),
            index: 1,
            name: String::from("测试应用"),
            url: Some(String::from("http://api.example.com")),
            size: Size::Mini,
            width: Some(String::from("60px")),
            round: Some(String::from("12px")),
            shape: Shape::Square,
            height: Some(String::from("60px")),
            marker: None,
            mirror_id: String::from("0"),
            text_size: Some(String::from("12px")),
            updated_at: now,
            created_at: now,
            text_color: Some(String::from("#4080ff")),
            component: Component::Bookmark,
            direction: Direction::Horizontal,
            description: String::from("测试描述"),
            collection_id: None,
            download_count: 0,
            background_color: None,
            background_image: None,
        })
    }
    pub fn toRemove() -> Result<Schema> {
        let now = DateTime::now().timestamp_millis();

        Ok(Schema {
            id: String::from("1234567890"),
            index: 1,
            name: String::from("测试应用"),
            url: Some(String::from("http://api.example.com")),
            size: Size::Mini,
            width: Some(String::from("60px")),
            round: Some(String::from("12px")),
            shape: Shape::Square,
            height: Some(String::from("60px")),
            marker: None,
            mirror_id: String::from("0"),
            text_size: Some(String::from("12px")),
            updated_at: now,
            created_at: now,
            text_color: Some(String::from("#4080ff")),
            component: Component::Bookmark,
            direction: Direction::Horizontal,
            description: String::from("测试描述"),
            collection_id: None,
            download_count: 0,
            background_color: None,
            background_image: None,
        })
    }
}
