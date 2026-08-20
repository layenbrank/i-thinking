use crate::{
    services::{
        auth::schema::{AuthR, Avatar, ProfileR, SigninR, SignupR},
        engine::schema::SuggestionR,
        application::schema::App,
        search::schema::{SearchR, WriteR as SearchWriteR},
        upload::schema::{ChunkR, FinalizeR, ProgressR, PrepareR},
        user::schema::UserR,
    },
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// 生成具象 Body schema（OpenAPI 不支持泛型包装）
macro_rules! body {
    ($name:ident, $data:ty) => {
        #[derive(Debug, Serialize, ToSchema)]
        #[serde(rename_all = "camelCase")]
        pub struct $name {
            /// 业务状态码（200000=成功）
            pub code: i32,
            pub success: bool,
            pub msg: String,
            pub data: Option<$data>,
            pub timestamp: i64,
        }
    };
}

body!(HealthBody, Health);
body!(SigninBody, SigninR);
body!(SignupBody, SignupR);
body!(ProfileBody, ProfileR);
body!(UserBody, UserR);
body!(UserListBody, Vec<UserR>);
body!(UploadPrepareBody, PrepareR);
body!(ChunkUploadBody, ChunkR);
body!(FinalizeUploadBody, FinalizeR);
body!(UploadProgressBody, ProgressR);
body!(SuggestionBody, SuggestionR);
body!(ApplicationBody, App);
body!(SearchWriteBody, SearchWriteR);
body!(SearchBody, SearchR);
body!(EmptyBody, EmptyR);

/// 健康检查 data 字段
#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Health {
    pub status: String,
    pub version: String,
    pub timestamp: i64,
    pub uptime: String,
    /// PostgreSQL：up / down
    pub postgres: String,
    /// Redis：up / down
    pub redis: String,
    /// Elasticsearch 集群状态或 down
    pub elasticsearch: String,
}

/// 无 data 载荷（如登出成功）
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct EmptyR {}

/// multipart 分片上传表单
#[derive(Debug, ToSchema)]
pub struct ChunkUploadForm {
    /// 上传会话 ID
    #[schema(example = "550e8400-e29b-41d4-a716-446655440000")]
    pub id: String,
    /// 分片序号（从 0 开始）
    #[schema(example = 0)]
    pub index: u32,
    /// 二进制分片文件
    #[schema(format = Binary, content_media_type = "application/octet-stream")]
    pub file: String,
}

pub use crate::utils::response::ErrorBody;

/// 登录成功示例
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SigninSuccessExample {
    pub code: i32,
    pub success: bool,
    pub msg: String,
    pub data: Option<SigninExampleData>,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SigninExampleData {
    pub token: String,
    pub id: String,
    pub username: String,
    pub created_at: i64,
    pub updated_at: i64,
}

/// 登录失败示例（凭证无效）
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SigninErrorExample {
    pub code: i32,
    pub success: bool,
    pub msg: String,
    pub timestamp: i64,
}

#[allow(dead_code)]
pub fn signin_success_example() -> SigninSuccessExample {
    SigninSuccessExample {
        code: 200_000,
        success: true,
        msg: "登录成功".to_string(),
        data: Some(SigninExampleData {
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...".to_string(),
            id: "550e8400-e29b-41d4-a716-446655440000".to_string(),
            username: "demo".to_string(),
            created_at: 1_700_000_000_000,
            updated_at: 1_700_000_000_000,
        }),
        timestamp: 1_700_000_000_000,
    }
}

#[allow(dead_code)]
pub fn signin_error_example() -> SigninErrorExample {
    SigninErrorExample {
        code: 500_301,
        success: false,
        msg: "用户名或密码错误".to_string(),
        timestamp: 1_700_000_000_000,
    }
}

// 确保 common 模块引用 auth schema 类型（供 components 注册）
#[allow(dead_code)]
pub fn _schema_refs() {
    let _: Option<Avatar> = None;
    let _: Option<AuthR> = None;
}
