pub mod auth;
pub mod common;
pub mod engine;
pub mod application;
pub mod paths;
pub mod system;
pub mod upload;
pub mod user;

use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};
use utoipa::{Modify, OpenApi};

use crate::oas::common::{
    ErrorBody, ChunkUploadBody, ChunkUploadForm, HealthBody, SigninBody, SigninErrorExample,
    SigninSuccessExample, SignupBody, ProfileBody, UserBody, UserListBody, UploadPrepareBody,
    FinalizeUploadBody, UploadProgressBody, SuggestionBody, ApplicationBody, Health,
};
use crate::services::auth::schema::{
    AuthR, Avatar, Gender, ProfileR, SigninP, SigninR, SignupP, SignupR, ProfileP,
};
use crate::services::engine::schema::{EmptySchema, ISchema, SuggestionR, TSchema, QueryP};
use crate::services::application::schema::{
    App, Component, Direction, Shape, Size,
};
use crate::services::upload::schema::{
    ChunkR, FinalizeP, FinalizeR, ProgressR, PrepareP, PrepareR, UploadStatus,
};
use crate::services::user::schema::{Avatar as UserAvatar, UpdateP, WriteP, UserR};

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearer_auth",
                SecurityScheme::Http(
                    HttpBuilder::new()
                        .scheme(HttpAuthScheme::Bearer)
                        .bearer_format("JWT")
                        .description(Some(
                            "登录接口返回的 JWT token，格式：Authorization: Bearer <token>",
                        ))
                        .build(),
                ),
            );
        }
    }
}

#[derive(OpenApi)]
#[openapi(
    info(
        title = "CoreX Service API",
        version = env!("CARGO_PKG_VERSION"),
        description = "HTTP 状态码始终为 200；业务结果见响应体 body.code（200000=成功）。\
            错误码规则见 /guide/error-codes.md。ErrorBody.details 字段仅在开发环境返回。",
        contact(name = "CoreX Team", email = "15638470820@163.com"),
        license(name = "Proprietary")
    ),
    servers(
        (url = "http://127.0.0.1:3000", description = "development"),
        (url = "https://api.example.com", description = "production")
    ),
    paths(
        system::health_doc,
        auth::signin_doc,
        auth::signup_doc,
        auth::toRead_doc,
        auth::toUpdate_doc,
        user::toRead_doc,
        user::toWrite_doc,
        user::toRead_by_id_doc,
        user::toUpdate_doc,
        user::toRemove_doc,
        upload::prepare_upload_doc,
        upload::chunk_upload_doc,
        upload::finalize_upload_doc,
        upload::progress_upload_doc,
        upload::cancel_upload_doc,
        upload::serve_file_doc,
        engine::toRead_doc,
        application::toRead_doc,
    ),
    components(
        schemas(
            ErrorBody,
            Health,
            HealthBody,
            SigninP,
            SigninR,
            SigninBody,
            SigninSuccessExample,
            SigninErrorExample,
            SignupP,
            SignupR,
            SignupBody,
            ProfileP,
            ProfileR,
            ProfileBody,
            AuthR,
            Avatar,
            Gender,
            WriteP,
            UpdateP,
            UserR,
            UserBody,
            UserListBody,
            UserAvatar,
            PrepareP,
            PrepareR,
            UploadPrepareBody,
            ChunkUploadForm,
            ChunkR,
            ChunkUploadBody,
            FinalizeP,
            FinalizeR,
            FinalizeUploadBody,
            ProgressR,
            UploadProgressBody,
            UploadStatus,
            QueryP,
            TSchema,
            EmptySchema,
            ISchema,
            SuggestionR,
            SuggestionBody,
            App,
            ApplicationBody,
            Size,
            Shape,
            Component,
            Direction,
        )
    ),
    tags(
        (name = "System", description = "系统级接口"),
        (name = "Auth", description = "认证与个人资料"),
        (name = "User", description = "后台用户管理（需 JWT）"),
        (name = "Upload", description = "分片文件上传"),
        (name = "Engine", description = "搜索引擎代理"),
        (name = "Application", description = "应用入口（Mock）"),
    ),
    modifiers(&SecurityAddon),
    external_docs(
        url = "/guide/error-codes.md",
        description = "业务错误码说明"
    )
)]
pub struct OpenDoc;

/// 生成 OpenAPI JSON 字符串
pub fn json_pretty() -> String {
    OpenDoc::openapi().to_pretty_json().expect("valid oas spec")
}

/// 判断 spec 是否包含指定路由（method + path）
pub fn has_route(method: &str, path: &str, spec: &utoipa::openapi::OpenApi) -> bool {
    let Some(item) = spec.paths.paths.get(path) else {
        return false;
    };
    match method.to_uppercase().as_str() {
        "GET" => item.get.is_some(),
        "POST" => item.post.is_some(),
        "PUT" => item.put.is_some(),
        "DELETE" => item.delete.is_some(),
        "PATCH" => item.patch.is_some(),
        _ => false,
    }
}
