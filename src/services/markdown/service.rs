use crate::{databases::database::Storage, services::markdown::schema::MarkdownSchema};
use actix_web::Result;

pub struct MarkdownService;

impl MarkdownService {
    pub fn toRead(storage: &Storage) -> Result<MarkdownSchema> {
        // storage.markdown()
        Ok(MarkdownSchema {
            id: String::from(""),
            content: String::from(""),
        })
    }
    pub fn toInsert() -> Result<MarkdownSchema> {
        Ok(MarkdownSchema {
            id: String::from(""),
            content: String::from(""),
        })
    }
    pub fn toUpdate() -> Result<MarkdownSchema> {
        Ok(MarkdownSchema {
            id: String::from(""),
            content: String::from(""),
        })
    }
    pub fn toRemove() -> Result<MarkdownSchema> {
        Ok(MarkdownSchema {
            id: String::from(""),
            content: String::from(""),
        })
    }
}
