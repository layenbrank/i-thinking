use crate::{databases::database::Storage, services::markdown::schema::MarkdownSchema};
use actix_web::Result;

pub struct MarkdownService;

impl MarkdownService {
    pub fn read(storage: &Storage) -> Result<MarkdownSchema> {
        // storage.markdown()
        Ok(MarkdownSchema {
            id: String::from(""),
            content: String::from(""),
        })
    }
    pub fn insert() -> Result<MarkdownSchema> {
        Ok(MarkdownSchema {
            id: String::from(""),
            content: String::from(""),
        })
    }
    pub fn update() -> Result<MarkdownSchema> {
        Ok(MarkdownSchema {
            id: String::from(""),
            content: String::from(""),
        })
    }
    pub fn remove() -> Result<MarkdownSchema> {
        Ok(MarkdownSchema {
            id: String::from(""),
            content: String::from(""),
        })
    }
}
