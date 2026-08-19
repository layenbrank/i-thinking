use actix_web::{HttpResponse, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use utoipa::ToSchema;

/// 企业级业务状态码定义
///
/// 编码规则: XXYYZZ
/// XX: 模块代码 (00-99)
/// YY: 功能代码 (00-99)
/// ZZ: 错误代码 (00-99)

/// 成功状态码
pub const SUCCESS: i32 = 200000;

/// 系统级错误 (10xxxx)
pub mod system {
    pub const INTERNAL_ERROR: i32 = 100001;
    pub const SERVICE_UNAVAILABLE: i32 = 100002;
    pub const MAINTENANCE: i32 = 100003;
    pub const TIMEOUT: i32 = 100004;
    pub const RESOURCE_EXHAUSTED: i32 = 100005;
}

/// 请求相关错误 (20xxxx)
pub mod request {
    pub const MISSING_PARAMETER: i32 = 200001;
    pub const INVALID_PARAMETER_FORMAT: i32 = 200002;
    pub const INVALID_PARAMETER_VALUE: i32 = 200003;
    pub const REQUEST_TOO_LARGE: i32 = 200004;
    pub const RATE_LIMIT_EXCEEDED: i32 = 200005;
    pub const METHOD_NOT_ALLOWED: i32 = 200006;
    pub const INVALID_HEADER: i32 = 200007;
}

/// 认证授权错误 (30xxxx)
pub mod auth {
    pub const NOT_LOGGED_IN: i32 = 300001;
    pub const INVALID_CREDENTIALS: i32 = 300002;
    pub const TOKEN_EXPIRED: i32 = 300003;
    pub const ACCOUNT_LOCKED: i32 = 300004;
    pub const ACCOUNT_DISABLED: i32 = 300005;
    pub const INSUFFICIENT_PERMISSIONS: i32 = 300006;
    pub const ACCESS_DENIED: i32 = 300007;
    pub const TWO_FACTOR_REQUIRED: i32 = 300008;
}

/// 资源相关错误 (40xxxx)
pub mod resource {
    pub const NOT_FOUND: i32 = 400001;
    pub const ALREADY_EXISTS: i32 = 400002;
    pub const DELETED: i32 = 400003;
    pub const ACCESS_RESTRICTED: i32 = 400004;
    pub const IN_USE: i32 = 400005;
    pub const QUOTA_EXCEEDED: i32 = 400006;
}

/// 业务逻辑错误 (50xxxx)
pub mod business {
    /// 用户模块 (5001xx)
    pub mod user {
        pub const NOT_FOUND: i32 = 500101;
        pub const USERNAME_EXISTS: i32 = 500102;
        pub const EMAIL_EXISTS: i32 = 500103;
        pub const PHONE_EXISTS: i32 = 500104;
        pub const WEAK_PASSWORD: i32 = 500105;
        pub const INVALID_STATUS: i32 = 500106;
    }

    /// 文件上传模块 (5002xx)
    pub mod upload {
        pub const UNSUPPORTED_FILE_TYPE: i32 = 500201;
        pub const FILE_TOO_LARGE: i32 = 500202;
        pub const UPLOAD_FAILED: i32 = 500203;
        pub const FILE_NOT_FOUND: i32 = 500204;
        pub const CHECKSUM_FAILED: i32 = 500205;
        pub const STORAGE_FULL: i32 = 500206;
    }

    /// 认证模块 (5003xx)
    pub mod login {
        pub const INVALID_CREDENTIALS: i32 = 500301;
        pub const INVALID_CAPTCHA: i32 = 500302;
        pub const CAPTCHA_EXPIRED: i32 = 500303;
        pub const TOO_MANY_ATTEMPTS: i32 = 500304;
        pub const RESET_PASSWORD_FAILED: i32 = 500305;
    }
}

/// 外部服务错误 (60xxxx)
pub mod external {
    pub const DATABASE_ERROR: i32 = 600001;
    pub const DATABASE_OPERATION_FAILED: i32 = 600002;
    pub const CACHE_ERROR: i32 = 600003;
    pub const MESSAGE_QUEUE_ERROR: i32 = 600004;
    pub const THIRD_PARTY_API_ERROR: i32 = 600005;
    pub const NETWORK_TIMEOUT: i32 = 600006;
}

/// 数据相关错误 (70xxxx)
pub mod data {
    pub const INVALID_FORMAT: i32 = 700001;
    pub const INTEGRITY_CHECK_FAILED: i32 = 700002;
    pub const DUPLICATE_DATA: i32 = 700003;
    pub const DATA_INCONSISTENCY: i32 = 700004;
    pub const DATA_EXPIRED: i32 = 700005;
}

/// 获取状态码的描述信息
pub fn description(code: i32) -> &'static str {
    match code {
        SUCCESS => "操作成功",

        // 系统错误
        system::INTERNAL_ERROR => "系统内部错误",
        system::SERVICE_UNAVAILABLE => "服务不可用",
        system::MAINTENANCE => "系统维护中",
        system::TIMEOUT => "系统超时",
        system::RESOURCE_EXHAUSTED => "系统资源不足",

        // 请求错误
        request::MISSING_PARAMETER => "请求参数缺失",
        request::INVALID_PARAMETER_FORMAT => "请求参数格式错误",
        request::INVALID_PARAMETER_VALUE => "请求参数值无效",
        request::REQUEST_TOO_LARGE => "请求体过大",
        request::RATE_LIMIT_EXCEEDED => "请求频率过高",
        request::METHOD_NOT_ALLOWED => "请求方法不支持",
        request::INVALID_HEADER => "请求头缺失或无效",

        // 认证授权错误
        auth::NOT_LOGGED_IN => "用户未登录",
        auth::INVALID_CREDENTIALS => "登录凭证无效",
        auth::TOKEN_EXPIRED => "登录凭证过期",
        auth::ACCOUNT_LOCKED => "账号被锁定",
        auth::ACCOUNT_DISABLED => "账号被禁用",
        auth::INSUFFICIENT_PERMISSIONS => "权限不足",
        auth::ACCESS_DENIED => "访问被拒绝",
        auth::TWO_FACTOR_REQUIRED => "需要二次验证",

        // 资源错误
        resource::NOT_FOUND => "资源不存在",
        resource::ALREADY_EXISTS => "资源已存在",
        resource::DELETED => "资源已被删除",
        resource::ACCESS_RESTRICTED => "资源访问被限制",
        resource::IN_USE => "资源正在被使用",
        resource::QUOTA_EXCEEDED => "资源配额不足",

        // 业务逻辑错误
        business::user::NOT_FOUND => "用户不存在",
        business::user::USERNAME_EXISTS => "用户名已存在",
        business::user::EMAIL_EXISTS => "邮箱已被注册",
        business::user::PHONE_EXISTS => "手机号已被注册",
        business::user::WEAK_PASSWORD => "密码强度不够",
        business::user::INVALID_STATUS => "用户状态异常",

        business::upload::UNSUPPORTED_FILE_TYPE => "文件类型不支持",
        business::upload::FILE_TOO_LARGE => "文件大小超出限制",
        business::upload::UPLOAD_FAILED => "文件上传失败",
        business::upload::FILE_NOT_FOUND => "文件不存在",
        business::upload::CHECKSUM_FAILED => "文件校验失败",
        business::upload::STORAGE_FULL => "存储空间不足",

        business::login::INVALID_CREDENTIALS => "用户名或密码错误",
        business::login::INVALID_CAPTCHA => "验证码错误",
        business::login::CAPTCHA_EXPIRED => "验证码已过期",
        business::login::TOO_MANY_ATTEMPTS => "登录失败次数过多",
        business::login::RESET_PASSWORD_FAILED => "密码重置失败",

        // 外部服务错误
        external::DATABASE_ERROR => "数据库连接失败",
        external::DATABASE_OPERATION_FAILED => "数据库操作失败",
        external::CACHE_ERROR => "缓存服务异常",
        external::MESSAGE_QUEUE_ERROR => "消息队列异常",
        external::THIRD_PARTY_API_ERROR => "第三方API调用失败",
        external::NETWORK_TIMEOUT => "网络连接超时",

        // 数据错误
        data::INVALID_FORMAT => "数据格式错误",
        data::INTEGRITY_CHECK_FAILED => "数据完整性校验失败",
        data::DUPLICATE_DATA => "数据重复",
        data::DATA_INCONSISTENCY => "数据不一致",
        data::DATA_EXPIRED => "数据过期",

        _ => "未知错误",
    }
}

/// 统一的响应结构
#[derive(Debug, Serialize, Deserialize)]
pub struct Body<T> {
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

impl<T> Body<T>
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
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ErrorBody {
    /// 业务错误码 (非0表示各种业务错误)
    pub code: i32,
    pub success: bool,
    pub msg: String,
    pub timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Object, nullable = true)]
    pub data: Option<Value>,
    /// 详细错误信息 (仅开发环境返回)
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Object, nullable = true)]
    pub details: Option<Value>,
}

impl ErrorBody {
    /// 创建客户端错误响应 - 请求参数错误
    pub fn bad_request(msg: impl Into<String>) -> Self {
        Self {
            code: request::MISSING_PARAMETER,
            success: false,
            msg: msg.into(),
            data: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            details: None,
        }
    }

    /// 创建未授权错误响应 - 用户未登录
    pub fn unauthorized(msg: impl Into<String>) -> Self {
        Self {
            code: auth::NOT_LOGGED_IN,
            success: false,
            msg: msg.into(),
            data: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            details: None,
        }
    }

    /// 创建禁止访问错误响应 - 权限不足
    pub fn forbidden(msg: impl Into<String>) -> Self {
        Self {
            code: auth::INSUFFICIENT_PERMISSIONS,
            success: false,
            msg: msg.into(),
            data: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            details: None,
        }
    }

    /// 创建未找到错误响应 - 资源不存在
    pub fn not_found(msg: impl Into<String>) -> Self {
        Self {
            code: resource::NOT_FOUND,
            success: false,
            msg: msg.into(),
            data: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            details: None,
        }
    }

    /// 创建服务器内部错误响应 - 系统内部错误
    pub fn internal_error(msg: impl Into<String>) -> Self {
        Self {
            code: system::INTERNAL_ERROR,
            success: false,
            msg: msg.into(),
            data: None,
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
            data: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            details: None,
        }
    }

    /// 添加详细错误信息
    pub fn with_details(mut self, details: Value) -> Self {
        self.details = Some(details);
        self
    }

    /// 转换为 HttpResponse，始终返回 HTTP 200，业务错误通过响应体中的 code 字段表示
    pub fn transform(self) -> Result<HttpResponse> {
        Ok(HttpResponse::Ok().json(self))
    }
}

/// 空数据成功响应
impl Body<()> {
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

/// 便捷的响应构建器宏
#[macro_export]
macro_rules! ok {
    ($data:expr) => {
        $crate::utils::response::Body::success($data).transform()
    };
    ($data:expr, $message:expr) => {
        $crate::utils::response::Body::success_with_message($data, $message).transform()
    };
}

#[macro_export]
macro_rules! created {
    ($data:expr) => {
        $crate::utils::response::Body::write($data).transform()
    };
}

#[macro_export]
macro_rules! no_content {
    () => {
        $crate::utils::response::Body::no_content().transform()
    };
    ($message:expr) => {
        $crate::utils::response::Body::message_only($message).transform()
    };
}

#[macro_export]
macro_rules! fail {
    (bad_request, $message:expr) => {
        $crate::utils::response::ErrorBody::bad_request($message).transform()
    };
    (unauthorized, $message:expr) => {
        $crate::utils::response::ErrorBody::unauthorized($message).transform()
    };
    (forbidden, $message:expr) => {
        $crate::utils::response::ErrorBody::forbidden($message).transform()
    };
    (not_found, $message:expr) => {
        $crate::utils::response::ErrorBody::not_found($message).transform()
    };
    (internal, $message:expr) => {
        $crate::utils::response::ErrorBody::internal_error($message).transform()
    };
    ($code:expr, $message:expr) => {
        $crate::utils::response::ErrorBody::custom($code, $message).transform()
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
macro_rules! paginated {
    ($items:expr, $count:expr, $page:expr, $size:expr) => {
        $crate::utils::response::Body::success($crate::utils::response::Paginated::new(
            $items, $count, $page, $size,
        ))
        .transform()
    };
}
