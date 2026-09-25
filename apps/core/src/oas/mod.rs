pub mod application;
pub mod auth;
pub mod common;
pub mod engine;
pub mod gateway;
pub mod payment;
pub mod paths;
pub mod search;
pub mod sso;
pub mod subscription;
pub mod system;
pub mod tenant;
pub mod upload;
pub mod user;

use utoipa::openapi::extensions::Extensions;
use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};
use utoipa::{Modify, OpenApi};

use crate::oas::common::{
    ApplicationEnvelope, CaptchaEnvelope, CatalogEnvelope, ChunkUploadEnvelope, ChunkUploadForm,
    EmptyEnvelope, EmptyR, Exception, FinalizeUploadEnvelope, Health, HealthEnvelope, MemberEnvelope,
    MemberListEnvelope, ModelEnvelope, ModelListEnvelope, OrderEnvelope, OrderListEnvelope,
    PlansEnvelope, ProfileEnvelope, ProviderEnvelope, ProviderListEnvelope, QuotaEnvelope,
    SearchEnvelope, SearchWriteEnvelope, SelfQuotaEnvelope, SigninEnvelope, SigninErrorExample,
    SigninSuccessExample, SignupEnvelope, SsoConnectionEnvelope, SsoConnectionListEnvelope,
    SsoLoginEnvelope, SubscriptionEnvelope, SubscriptionListEnvelope, SuggestionEnvelope,
    TenantEnvelope, TenantListEnvelope, UploadFilesEnvelope, UploadHashEnvelope,
    UploadPrepareEnvelope, UploadProgressEnvelope, UserEnvelope, UserListEnvelope,
};
use crate::services::application::schema::{App, Component, Direction, Shape, Size};
use crate::services::auth::schema::{
    AuthR, Avatar, CaptchaP, CaptchaR, EmailSigninP, ForgotPasswordP, Gender, OtpChannel, OtpP,
    PasswordP, PhoneSigninP, ProfileP, ProfileR, ResetPasswordP, SigninP, SigninR, SignupP,
    SignupR,
};
use crate::services::engine::schema::{EmptySchema, ISchema, QueryP, SuggestionR, TSchema};
use crate::services::gateway::schema::{
    ChatCompletionsP, ModelR, ModelUpdateP, ModelWriteP, PlanR, PlansR, ProviderR, ProviderUpdateP,
    ProviderWriteP, SelfQuotaP, SelfQuotaR,
};
use crate::services::payment::schema::{CatalogR, OrderP, OrderR};
use crate::services::search::schema::{
    HitR, QueryP as SearchQueryP, SearchR, WriteP as SearchWriteP, WriteR as SearchWriteR,
};
use crate::services::sso::schema::{
    SsoConnectionR, SsoConnectionUpdateP, SsoConnectionWriteP, SsoLoginR,
};
use crate::services::subscription::schema::{QuotaR, SubscribeP, SubscriptionR};
use crate::services::tenant::schema::{
    MemberR, MemberUpdateP, MemberWriteP, TenantR, TenantRole, TenantUpdateP, TenantWriteP,
};
use crate::services::upload::schema::{
    AssetR, ChunkR, FilesP, FilesR, FinalizeP, FinalizeR, HashP, HashR, PrepareP, PrepareR,
    ProgressR, UploadStatus, UploadedChunk, Visibility,
};
use crate::services::user::schema::{Avatar as UserAvatar, UpdateP, UserR, WriteP};

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            let mut http = HttpBuilder::new()
                .scheme(HttpAuthScheme::Bearer)
                .bearer_format("JWT")
                .description(Some(
                    "登录 `POST /api/v1/auth/signin` 返回的 `data.token`。\n\n\
                     请求头：`Authorization: Bearer <token>`。\n\n\
                     **Apifox**：鉴权组件 Token 请填 `{{token}}`（勿用 `{{bearerToken}}`）；\
                     环境变量名统一为 `token`，可在登录接口后置操作写入。",
                ))
                .build();
            // 供 Apifox / 部分客户端识别的默认占位（标准 OAS 无此字段）
            http.extensions = Some(Extensions::from_iter([
                ("x-default", serde_json::json!("{{token}}")),
                ("x-apifox-default", serde_json::json!("{{token}}")),
            ]));
            components.add_security_scheme("bearer_auth", SecurityScheme::Http(http));
        }
    }
}

#[derive(OpenApi)]
#[openapi(
    info(
        title = "CoreX Service API",
        version = env!("CARGO_PKG_VERSION"),
        description = "HTTP 状态码始终为 200；业务结果见响应体 body.code（200000=成功）。\
            错误码规则见 /guide/error-codes.md。Exception.details 字段仅在开发环境返回。\
            鉴权：JWT Bearer；Apifox 环境变量统一使用 {{token}}（来自 signin.data.token）。\
            密码登录 / 注册 / 发 OTP 前须先 POST /api/v1/auth/captcha 获取 captchaKey（go-captcha 行为验证码）。",
        contact(name = "CoreX Team", email = "15638470820@163.com"),
        license(name = "Proprietary")
    ),
    servers(
        (url = "http://127.0.0.1:3000", description = "development"),
        (url = "https://api.example.com", description = "production")
    ),
    paths(
        system::health_doc,
        auth::captcha_doc,
        auth::otp_doc,
        auth::signin_doc,
        auth::signin_phone_doc,
        auth::signin_email_doc,
        auth::signup_doc,
        auth::password_forgot_doc,
        auth::password_reset_doc,
        auth::password_doc,
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
        upload::toRead_files_doc,
        upload::serve_file_doc,
        upload::serve_asset_doc,
        engine::toRead_doc,
        search::toWrite_doc,
        search::toRead_doc,
        application::toRead_doc,
        tenant::toList_doc,
        tenant::toWrite_doc,
        tenant::toRead_by_id_doc,
        tenant::toUpdate_doc,
        tenant::toRemove_doc,
        tenant::members_doc,
        tenant::member_add_doc,
        tenant::member_update_doc,
        tenant::member_remove_doc,
        subscription::toList_doc,
        subscription::toWrite_doc,
        subscription::toRemove_doc,
        subscription::quota_doc,
        gateway::chat_doc,
        gateway::models_doc,
        gateway::providers_doc,
        gateway::provider_write_doc,
        gateway::provider_update_doc,
        gateway::provider_remove_doc,
        gateway::models_admin_doc,
        gateway::model_write_doc,
        gateway::model_update_doc,
        gateway::model_remove_doc,
        gateway::usage_doc,
        gateway::audit_doc,
        gateway::quota_me_doc,
        gateway::plans_doc,
        sso::connections_doc,
        sso::connection_write_doc,
        sso::connection_update_doc,
        sso::connection_remove_doc,
        sso::authorize_doc,
        sso::callback_doc,
        payment::catalog_doc,
        payment::toList_doc,
        payment::toWrite_doc,
        payment::toRead_by_no_doc,
        payment::sync_doc,
        payment::close_doc,
        payment::notify_wechat_doc,
        payment::notify_alipay_doc,
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
            CaptchaP,
            CaptchaR,
            CaptchaEnvelope,
            OtpP,
            OtpChannel,
            PhoneSigninP,
            EmailSigninP,
            ForgotPasswordP,
            ResetPasswordP,
            PasswordP,
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
            FilesP,
            AssetR,
            FilesR,
            UploadFilesEnvelope,
            UploadStatus,
            Visibility,
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
            TenantR,
            MemberR,
            TenantWriteP,
            TenantUpdateP,
            MemberWriteP,
            MemberUpdateP,
            TenantRole,
            TenantEnvelope,
            TenantListEnvelope,
            MemberEnvelope,
            MemberListEnvelope,
            SubscribeP,
            SubscriptionR,
            SubscriptionEnvelope,
            SubscriptionListEnvelope,
            QuotaR,
            QuotaEnvelope,
            ChatCompletionsP,
            ProviderR,
            ProviderWriteP,
            ProviderUpdateP,
            ModelR,
            ModelWriteP,
            ModelUpdateP,
            ProviderEnvelope,
            ProviderListEnvelope,
            ModelEnvelope,
            ModelListEnvelope,
            SelfQuotaP,
            SelfQuotaR,
            SelfQuotaEnvelope,
            PlanR,
            PlansR,
            PlansEnvelope,
            SsoConnectionR,
            SsoConnectionWriteP,
            SsoConnectionUpdateP,
            SsoLoginR,
            SsoConnectionEnvelope,
            SsoConnectionListEnvelope,
            SsoLoginEnvelope,
            CatalogR,
            CatalogEnvelope,
            OrderP,
            OrderR,
            OrderEnvelope,
            OrderListEnvelope,
        )
    ),
    tags(
        (name = "System", description = "系统级接口"),
        (name = "Auth", description = "认证与个人资料（图形验证码、OTP、密码/手机/邮箱登录）"),
        (name = "User", description = "后台用户管理（需 JWT）"),
        (name = "Upload", description = "分片文件上传"),
        (name = "Engine", description = "搜索引擎代理"),
        (name = "Search", description = "Elasticsearch 全文检索"),
        (name = "Application", description = "应用入口（Mock）"),
        (name = "Tenant", description = "多租户组织与成员（需 JWT）"),
        (name = "Subscription", description = "个人租户订阅：免费/付费档位配额（需 JWT）"),
        (name = "Gateway", description = "模型网关：转发/配额/用量/审计（需 JWT）"),
        (name = "SSO", description = "单点登录（OIDC）"),
        (name = "Payment", description = "支付：档位/渠道目录、订单、渠道回调（下单需 JWT）"),
    ),
    modifiers(&SecurityAddon),
    external_docs(
        url = "/guide/error-codes.md",
        description = "业务错误码说明"
    )
)]
pub struct OpenDoc;

/// 生成 OpenAPI JSON 字符串。
///
/// 输出必须规范化（所有对象键递归升序）：utoipa 的 `Extensions` 内部是 `HashMap`，
/// 直接序列化时键序随进程随机化——同一二进制连续运行会产出两种字节序列，
/// 会让「重新生成 + git diff」的漂移校验随机失败。排序由本函数自身保证，
/// 不依赖 `serde_json` 的 `preserve_order` 特性开关。
pub fn json_pretty() -> String {
    let mut spec = serde_json::to_value(OpenDoc::openapi()).expect("valid oas spec");
    sort_keys(&mut spec);
    serde_json::to_string_pretty(&spec).expect("valid oas spec")
}

fn sort_keys(value: &mut serde_json::Value) {
    match value {
        serde_json::Value::Object(map) => {
            let mut entries: Vec<(String, serde_json::Value)> =
                std::mem::take(map).into_iter().collect();
            entries.sort_by(|a, b| a.0.cmp(&b.0));
            for (key, mut child) in entries {
                sort_keys(&mut child);
                map.insert(key, child);
            }
        }
        serde_json::Value::Array(items) => items.iter_mut().for_each(sort_keys),
        _ => {}
    }
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
