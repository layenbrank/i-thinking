use sea_orm::DbErr;
use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum Exception {
    #[error("数据库错误：{0}")]
    Database(#[from] DbErr),

    #[error("未找到：{0}")]
    NotFound(String),

    #[error("验证错误：{0}")]
    Validation(String),

    #[error("权限错误：{0}")]
    Permission(String),

    #[error("内部错误：{0}")]
    Internal(String),

    #[error("IO 错误：{0}")]
    Io(#[from] std::io::Error),

    #[error("通用错误：{0}")]
    Anyhow(#[from] anyhow::Error),
}

impl Serialize for Exception {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// Tauri 命令返回类型
pub type CommandResult<T> = Result<T, Exception>;
