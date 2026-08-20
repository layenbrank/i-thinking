//! 成功响应信封（Nest Interceptor 角色）

use actix_web::{HttpResponse, Result};
use serde::{Deserialize, Serialize};

use crate::utils::code::SUCCESS;

/// 统一的成功响应信封
#[derive(Debug, Serialize, Deserialize)]
pub struct Envelope<T> {
    /// 业务状态码
    pub code: i32,
    /// 响应是否成功
    pub success: bool,
    /// 响应消息
    pub msg: String,
    /// 响应数据
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    /// 时间戳
    pub timestamp: i64,
}

impl<T> Envelope<T>
where
    T: Serialize,
{
    /// 创建成功响应（带自定义消息）
    pub fn success(data: T, message: impl Into<String>) -> Self {
        Self {
            code: SUCCESS,
            success: true,
            msg: message.into(),
            data: Some(data),
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }

    /// 创建成功响应
    pub fn write(data: T) -> Self {
        Self {
            code: SUCCESS,
            success: true,
            msg: "创建成功".to_string(),
            data: Some(data),
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }

    /// 转换为 HttpResponse，总是返回 HTTP 200
    pub fn transform(self) -> Result<HttpResponse> {
        Ok(HttpResponse::Ok().json(self))
    }
}

impl Envelope<()> {
    /// 创建无数据成功响应
    pub fn no_content() -> Self {
        Self {
            code: SUCCESS,
            success: true,
            msg: "No content".to_string(),
            data: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }

    /// 创建通用成功响应（仅消息）
    pub fn message_only(message: impl Into<String>) -> Self {
        Self {
            code: SUCCESS,
            success: true,
            msg: message.into(),
            data: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }
}

/// 分页响应数据（置于 [`Envelope::data`]）
#[derive(Debug, Serialize, Deserialize)]
pub struct Paginated<T> {
    pub items: Vec<T>,
    pub count: u64,
    pub page: u32,
    pub size: u32,
    pub total: u32,
    pub next: bool,
    pub prev: bool,
}

impl<T> Paginated<T> {
    pub fn new(items: Vec<T>, count: u64, page: u32, size: u32) -> Self {
        let total = ((count as f64) / (size as f64)).ceil() as u32;
        let next = page < total;
        let prev = page > 1;

        Self {
            items,
            count,
            page,
            size,
            total,
            next,
            prev,
        }
    }
}

/// 便捷的成功响应宏
#[macro_export]
macro_rules! ok {
    ($data:expr) => {
        $crate::interceptors::envelope::Envelope::success($data, "操作成功").transform()
    };
    ($data:expr, $message:expr) => {
        $crate::interceptors::envelope::Envelope::success($data, $message).transform()
    };
}

#[macro_export]
macro_rules! created {
    ($data:expr) => {
        $crate::interceptors::envelope::Envelope::write($data).transform()
    };
}

#[macro_export]
macro_rules! no_content {
    () => {
        $crate::interceptors::envelope::Envelope::no_content().transform()
    };
    ($message:expr) => {
        $crate::interceptors::envelope::Envelope::message_only($message).transform()
    };
}

#[macro_export]
macro_rules! paginated {
    ($items:expr, $count:expr, $page:expr, $size:expr) => {
        $crate::interceptors::envelope::Envelope::success(
            $crate::interceptors::envelope::Paginated::new($items, $count, $page, $size),
            "操作成功",
        )
        .transform()
    };
}
