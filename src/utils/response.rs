use crate::utils::business;
use actix_web::{HttpResponse, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// 统一的 API 响应结构
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    /// 业务状态码 (0=成功, 非0=各种业务错误)
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

impl<T> ApiResponse<T>
where
    T: Serialize,
{
    /// 创建成功响应
    // pub fn success(data: T) -> Self {
    //     Self {
    //         code: business::SUCCESS,
    //         success: true,
    //         msg: "Success".to_string(),
    //         data: Some(data),
    //         timestamp: chrono::Utc::now().timestamp_millis(),
    //     }
    // }

    /// 创建成功响应（带自定义消息）
    pub fn success(data: T, message: impl Into<String>) -> Self {
        Self {
            code: business::SUCCESS,
            success: true,
            msg: message.into(),
            data: Some(data),
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }

    /// 创建创建成功响应 (201)
    pub fn insert(data: T) -> Self {
        Self {
            code: business::SUCCESS,
            success: true,
            msg: "insert successfully".to_string(),
            data: Some(data),
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }

    // 错误响应专用结构
    pub fn error(code: i32, msg: impl Into<String>) -> Self {
        Self {
            code,
            success: false,
            msg: msg.into(),
            data: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }

    /// 转换为 HttpResponse，总是返回 HTTP 200
    pub fn transform(self) -> Result<HttpResponse> {
        Ok(HttpResponse::Ok().json(self))
    }
}

/// 错误响应专用结构 (不包含 data 字段)
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiErrorResponse {
    /// 业务错误码 (非0表示各种业务错误)
    pub code: i32,
    pub success: bool,
    pub msg: String,
    pub timestamp: i64,
    /// 详细错误信息 (开发环境使用)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

impl ApiErrorResponse {
    /// 创建客户端错误响应 - 请求参数错误
    pub fn bad_request(msg: impl Into<String>) -> Self {
        Self {
            code: business::request::MISSING_PARAMETER,
            success: false,
            msg: msg.into(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            details: None,
        }
    }

    /// 创建未授权错误响应 - 用户未登录
    pub fn unauthorized(msg: impl Into<String>) -> Self {
        Self {
            code: business::auth::NOT_LOGGED_IN,
            success: false,
            msg: msg.into(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            details: None,
        }
    }

    /// 创建禁止访问错误响应 - 权限不足
    pub fn forbidden(msg: impl Into<String>) -> Self {
        Self {
            code: business::auth::INSUFFICIENT_PERMISSIONS,
            success: false,
            msg: msg.into(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            details: None,
        }
    }

    /// 创建未找到错误响应 - 资源不存在
    pub fn not_found(msg: impl Into<String>) -> Self {
        Self {
            code: business::resource::NOT_FOUND,
            success: false,
            msg: msg.into(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            details: None,
        }
    }

    /// 创建服务器内部错误响应 - 系统内部错误
    pub fn internal_error(msg: impl Into<String>) -> Self {
        Self {
            code: business::system::INTERNAL_ERROR,
            success: false,
            msg: msg.into(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            details: None,
        }
    }

    /// 创建自定义错误响应
    pub fn custom(code: i32, message: impl Into<String>) -> Self {
        Self {
            code,
            success: false,
            msg: message.into(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            details: None,
        }
    }

    /// 添加详细错误信息
    pub fn with_details(mut self, details: Value) -> Self {
        self.details = Some(details);
        self
    }

    /// 转换为 HttpResponse，根据业务错误码返回合适的 HTTP 状态码
    pub fn transform(self) -> Result<HttpResponse> {
        let http_status = match self.code {
            business::SUCCESS => actix_web::http::StatusCode::OK,
            100001..=199999 => actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, // 系统错误
            200001..=299999 => actix_web::http::StatusCode::BAD_REQUEST,           // 请求错误
            300001..=300005 => actix_web::http::StatusCode::UNAUTHORIZED,          // 认证错误
            300006..=399999 => actix_web::http::StatusCode::FORBIDDEN,             // 授权错误
            400001..=499999 => actix_web::http::StatusCode::NOT_FOUND,             // 资源错误
            500001..=599999 => actix_web::http::StatusCode::BAD_REQUEST,           // 业务逻辑错误
            600001..=699999 => actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, // 外部服务错误
            700001..=799999 => actix_web::http::StatusCode::BAD_REQUEST,           // 数据错误
            _ => actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,               // 未知错误
        };

        Ok(HttpResponse::build(http_status).json(self))
    }
}

/// 空数据成功响应
impl ApiResponse<()> {
    /// 创建无数据成功响应
    pub fn no_content() -> Self {
        Self {
            code: business::SUCCESS,
            success: true,
            msg: "No content".to_string(),
            data: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }

    /// 创建通用成功响应（仅消息）
    pub fn message_only(message: impl Into<String>) -> Self {
        Self {
            code: business::SUCCESS,
            success: true,
            msg: message.into(),
            data: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }
}

/// 便捷的响应构建器宏
#[macro_export]
macro_rules! api_success {
    ($data:expr) => {
        $crate::utils::response::ApiResponse::success($data).transform()
    };
    ($data:expr, $message:expr) => {
        $crate::utils::response::ApiResponse::success_with_message($data, $message).transform()
    };
}

#[macro_export]
macro_rules! api_created {
    ($data:expr) => {
        $crate::utils::response::ApiResponse::created($data).transform()
    };
}

#[macro_export]
macro_rules! api_no_content {
    () => {
        $crate::utils::response::ApiResponse::no_content().transform()
    };
    ($message:expr) => {
        $crate::utils::response::ApiResponse::message_only($message).transform()
    };
}

#[macro_export]
macro_rules! api_error {
    (bad_request, $message:expr) => {
        $crate::utils::response::ApiErrorResponse::bad_request($message).transform()
    };
    (unauthorized, $message:expr) => {
        $crate::utils::response::ApiErrorResponse::unauthorized($message).transform()
    };
    (forbidden, $message:expr) => {
        $crate::utils::response::ApiErrorResponse::forbidden($message).transform()
    };
    (not_found, $message:expr) => {
        $crate::utils::response::ApiErrorResponse::not_found($message).transform()
    };
    (internal, $message:expr) => {
        $crate::utils::response::ApiErrorResponse::internal_error($message).transform()
    };
    ($code:expr, $message:expr) => {
        $crate::utils::response::ApiErrorResponse::custom($code, $message).transform()
    };
}

/// 分页响应数据结构
#[derive(Debug, Serialize, Deserialize)]
pub struct Paginated<T> {
    /// 数据列表
    pub items: Vec<T>,
    /// 总数量
    pub count: u64,
    /// 当前页码
    pub page: u32,
    /// 每页大小
    pub size: u32,
    /// 总页数
    pub total: u32,
    /// 是否有下一页
    pub next: bool,
    /// 是否有上一页
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

/// 分页响应宏
#[macro_export]
macro_rules! api_paginated {
    ($items:expr, $count:expr, $page:expr, $size:expr) => {
        $crate::utils::response::ApiResponse::success($crate::utils::response::Paginated::new(
            $items, $count, $page, $size,
        ))
        .transform()
    };
}
