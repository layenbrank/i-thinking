use crate::{
    services::application::schema::{App, Component, Direction, Shape, Size},
    utils::response::ErrorBody,
};
use actix_web::Result;
use chrono::Utc;

pub struct ApplicationService;

#[derive(Debug, thiserror::Error)]
pub enum ApplicationError {
    #[error("HTTP error {status}: {message}")]
    HttpStatusError { status: u16, message: String },
    #[error("Invalid response format: {0}")]
    InvalidResponseFormat(String),
}

impl From<ApplicationError> for ErrorBody {
    fn from(err: ApplicationError) -> Self {
        use crate::utils::response::data;
        match err {
            ApplicationError::HttpStatusError { status, message } => ErrorBody::custom(
                data::DATA_INCONSISTENCY,
                format!("HTTP错误 {}: {}", status, message),
            ),
            ApplicationError::InvalidResponseFormat(msg) => {
                ErrorBody::custom(data::DATA_INCONSISTENCY, format!("响应格式错误: {}", msg))
            }
        }
    }
}

impl ApplicationService {
    fn mock_app(url: &str) -> App {
        let now = Utc::now().timestamp_millis();
        App {
            id: String::from("1234567890"),
            index: 1,
            name: String::from("测试应用"),
            url: Some(String::from(url)),
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
        }
    }

    pub async fn toRead() -> Result<App, ApplicationError> {
        Ok(Self::mock_app("https://api.example.com"))
    }

    pub async fn toWrite() -> Result<App> {
        Ok(Self::mock_app("http://api.example.com"))
    }

    pub fn toUpdate() -> Result<App> {
        Ok(Self::mock_app("http://api.example.com"))
    }

    pub fn toRemove() -> Result<App> {
        Ok(Self::mock_app("http://api.example.com"))
    }
}
