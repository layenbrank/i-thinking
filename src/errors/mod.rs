use actix_web::{HttpResponse, ResponseError};
// use std::fmt;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("DataBase error: {0}")]
    DataBaseError(#[from] mongodb::error::Error),

    #[error("User not found")]
    UserNotFound,

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Internal server error")]
    InternalServerError,

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse<actix_web::body::BoxBody> {
        match self {
            AppError::DataBaseError(err) => {
                HttpResponse::InternalServerError().body(format!("Database error: {}", err))
            }
            AppError::UserNotFound => HttpResponse::NotFound().json("User not found"),
            AppError::InvalidInput(msg) => {
                HttpResponse::BadRequest().json(format!("Invalid input: {}", msg))
            }
            AppError::InternalServerError => {
                HttpResponse::InternalServerError().json("Internal server error")
            }
            AppError::NotFound(msg) => HttpResponse::NotFound().json(format!("Not found: {}", msg)),
            AppError::Internal(msg) => {
                HttpResponse::InternalServerError().json(format!("Internal error: {}", msg))
            }
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;
