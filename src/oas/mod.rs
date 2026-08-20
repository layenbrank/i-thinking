pub mod application;
pub mod auth;
pub mod common;
pub mod engine;
pub mod paths;
pub mod search;
pub mod system;
pub mod upload;
pub mod user;

use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};
use utoipa::{Modify, OpenApi};

use crate::oas::common::{
    ApplicationEnvelope, ChunkUploadEnvelope, ChunkUploadForm, EmptyEnvelope, EmptyR, Exception,
    FinalizeUploadEnvelope, Health, HealthEnvelope, ProfileEnvelope, SearchEnvelope, SearchWriteEnvelope, SigninEnvelope,
    SigninErrorExample, SigninSuccessExample, SignupEnvelope, SuggestionEnvelope, UploadHashEnvelope,
    UploadPrepareEnvelope, UploadProgressEnvelope, UserEnvelope, UserListEnvelope,
};
use crate::services::application::schema::{App, Component, Direction, Shape, Size};
use crate::services::auth::schema::{
    AuthR, Avatar, Gender, ProfileP, ProfileR, SigninP, SigninR, SignupP, SignupR,
};
use crate::services::engine::schema::{EmptySchema, ISchema, QueryP, SuggestionR, TSchema};
use crate::services::search::schema::{
    HitR, QueryP as SearchQueryP, SearchR, WriteP as SearchWriteP, WriteR as SearchWriteR,
};
use crate::services::upload::schema::{
    ChunkR, FinalizeP, FinalizeR, HashP, HashR, PrepareP, PrepareR, ProgressR, UploadStatus,
    UploadedChunk,
};
use crate::services::user::schema::{Avatar as UserAvatar, UpdateP, UserR, WriteP};

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
            错误码规则见 /guide/error-codes.md。Exception.details 字段仅在开发环境返回。",
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
        auth::signout_doc,
        user::toRead_doc,
        user::toWrite_doc,
        user::toRead_by_id_doc,
        user::toUpdate_doc,
        user::toRemove_doc,
        upload::prepare_upload_doc,
        upload::bind_hash_doc,
        upload::chunk_upload_doc,
        upload::finalize_upload_doc,
        upload::progress_upload_doc,
        upload::cancel_upload_doc,
        upload::serve_file_doc,
        engine::toRead_doc,
        search::toWrite_doc,
        search::toRead_doc,
        application::toRead_doc,
    ),
    components(
        schemas(
            Exception,
            Health,
            HealthEnvelope,
            EmptyR,
            EmptyEnvelope,
            SigninP,
            SigninR,
            SigninEnvelope,
            SigninSuccessExample,
            SigninErrorExample,
            SignupP,
            SignupR,
            SignupEnvelope,
            ProfileP,
            ProfileR,
            ProfileEnvelope,
            AuthR,
            Avatar,
            Gender,
            WriteP,
            UpdateP,
            UserR,
            UserEnvelope,
            UserListEnvelope,
            UserAvatar,
            PrepareP,
            PrepareR,
            UploadedChunk,
            UploadPrepareEnvelope,
            HashP,
            HashR,
            UploadHashEnvelope,
            ChunkUploadForm,
            ChunkR,
            ChunkUploadEnvelope,
            FinalizeP,
            FinalizeR,
            FinalizeUploadEnvelope,
            ProgressR,
            UploadProgressEnvelope,
            UploadStatus,
            QueryP,
            TSchema,
            EmptySchema,
            ISchema,
            SuggestionR,
            SuggestionEnvelope,
            SearchWriteP,
            SearchWriteR,
            SearchQueryP,
            HitR,
            SearchR,
            SearchWriteEnvelope,
            SearchEnvelope,
            App,
            ApplicationEnvelope,
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
        (name = "Search", description = "Elasticsearch 全文检索"),
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
