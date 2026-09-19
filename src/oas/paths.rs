//! 路由常量 — module.rs 与 OpenAPI path doc 共用，防止路径漂移。

pub struct RouteDef {
    pub method: &'static str,
    pub path: &'static str,
}

// --- 系统 ---
pub const HEALTH: &str = "/api/health";

// --- Auth ---
pub const AUTH_CAPTCHA: &str = "/api/v1/auth/captcha";
pub const AUTH_OTP: &str = "/api/v1/auth/otp";
pub const AUTH_SIGNIN: &str = "/api/v1/auth/signin";
pub const AUTH_SIGNIN_PHONE: &str = "/api/v1/auth/signin/phone";
pub const AUTH_SIGNIN_EMAIL: &str = "/api/v1/auth/signin/email";
pub const AUTH_SIGNUP: &str = "/api/v1/auth/signup";
pub const AUTH_PROFILE: &str = "/api/v1/auth/profile";
pub const AUTH_SIGNOUT: &str = "/api/v1/auth/signout";
pub const AUTH_PASSWORD_FORGOT: &str = "/api/v1/auth/password/forgot";
pub const AUTH_PASSWORD_RESET: &str = "/api/v1/auth/password/reset";
pub const AUTH_PASSWORD: &str = "/api/v1/auth/password";

// --- User ---
pub const USERS: &str = "/api/v1/users";
pub const USERS_BY_ID: &str = "/api/v1/users/{id}";

// --- Upload ---
pub const UPLOAD_PREPARE: &str = "/api/v1/upload/prepare";
pub const UPLOAD_HASH: &str = "/api/v1/upload/hash";
pub const UPLOAD_CHUNK: &str = "/api/v1/upload/chunk";
pub const UPLOAD_FINALIZE: &str = "/api/v1/upload/finalize";
pub const UPLOAD_PROGRESS: &str = "/api/v1/upload/progress/{id}";
pub const UPLOAD_CANCEL: &str = "/api/v1/upload/cancel/{id}";
pub const UPLOAD_FILES: &str = "/api/v1/upload/files";
pub const UPLOAD_FILES_BY_HASH: &str = "/api/v1/upload/files/{hash}";
pub const UPLOAD_ASSET: &str = "/api/v1/upload/asset/{id}";

// --- Engine ---
pub const ENGINE_SUGGESTION: &str = "/api/v1/engine/suggestion";

// --- Search ---
pub const SEARCH_DOCS: &str = "/api/v1/search/docs";

// --- Application ---
pub const APPLICATION_TO_READ: &str = "/api/v1/application/toRead";

// --- Tenant ---
pub const TENANTS: &str = "/api/v1/tenants";
pub const TENANTS_BY_ID: &str = "/api/v1/tenants/{id}";
pub const TENANT_MEMBERS: &str = "/api/v1/tenants/{id}/members";
pub const TENANT_MEMBER_BY_ID: &str = "/api/v1/tenants/{id}/members/{userID}";
pub const TENANT_SUBSCRIPTIONS: &str = "/api/v1/tenants/{id}/subscriptions";
pub const TENANT_SUBSCRIPTION_BY_ID: &str = "/api/v1/tenants/{id}/subscriptions/{subscriptionID}";
pub const TENANT_QUOTA: &str = "/api/v1/tenants/{id}/quota";

// --- Gateway ---
pub const GATEWAY_CHAT: &str = "/api/v1/gateway/chat/completions";
pub const GATEWAY_MODELS: &str = "/api/v1/gateway/models";
pub const GATEWAY_PROVIDERS: &str = "/api/v1/gateway/providers";
pub const GATEWAY_PROVIDERS_BY_ID: &str = "/api/v1/gateway/providers/{id}";
pub const GATEWAY_ADMIN_MODELS: &str = "/api/v1/gateway/admin/models";
pub const GATEWAY_ADMIN_MODELS_BY_ID: &str = "/api/v1/gateway/admin/models/{id}";
pub const GATEWAY_USAGE: &str = "/api/v1/gateway/usage";
pub const GATEWAY_AUDIT: &str = "/api/v1/gateway/audit";

// --- SSO ---
pub const SSO_CONNECTIONS: &str = "/api/v1/sso/connections";
pub const SSO_CONNECTIONS_BY_ID: &str = "/api/v1/sso/connections/{id}";
pub const SSO_AUTHORIZE: &str = "/api/v1/sso/{id}/authorize";
pub const SSO_CALLBACK: &str = "/api/v1/sso/{id}/callback";

/// 所有对外路由（不含静态页 `/`、`/index.html`）
pub const ALL_ROUTES: &[RouteDef] = &[
    RouteDef {
        method: "GET",
        path: HEALTH,
    },
    RouteDef {
        method: "POST",
        path: AUTH_CAPTCHA,
    },
    RouteDef {
        method: "POST",
        path: AUTH_OTP,
    },
    RouteDef {
        method: "POST",
        path: AUTH_SIGNIN,
    },
    RouteDef {
        method: "POST",
        path: AUTH_SIGNIN_PHONE,
    },
    RouteDef {
        method: "POST",
        path: AUTH_SIGNIN_EMAIL,
    },
    RouteDef {
        method: "POST",
        path: AUTH_SIGNUP,
    },
    RouteDef {
        method: "GET",
        path: AUTH_PROFILE,
    },
    RouteDef {
        method: "PUT",
        path: AUTH_PROFILE,
    },
    RouteDef {
        method: "POST",
        path: AUTH_SIGNOUT,
    },
    RouteDef {
        method: "POST",
        path: AUTH_PASSWORD_FORGOT,
    },
    RouteDef {
        method: "POST",
        path: AUTH_PASSWORD_RESET,
    },
    RouteDef {
        method: "PUT",
        path: AUTH_PASSWORD,
    },
    RouteDef {
        method: "GET",
        path: USERS,
    },
    RouteDef {
        method: "POST",
        path: USERS,
    },
    RouteDef {
        method: "GET",
        path: USERS_BY_ID,
    },
    RouteDef {
        method: "PUT",
        path: USERS_BY_ID,
    },
    RouteDef {
        method: "DELETE",
        path: USERS_BY_ID,
    },
    RouteDef {
        method: "POST",
        path: UPLOAD_PREPARE,
    },
    RouteDef {
        method: "PATCH",
        path: UPLOAD_HASH,
    },
    RouteDef {
        method: "POST",
        path: UPLOAD_CHUNK,
    },
    RouteDef {
        method: "POST",
        path: UPLOAD_FINALIZE,
    },
    RouteDef {
        method: "GET",
        path: UPLOAD_PROGRESS,
    },
    RouteDef {
        method: "DELETE",
        path: UPLOAD_CANCEL,
    },
    RouteDef {
        method: "GET",
        path: UPLOAD_FILES,
    },
    RouteDef {
        method: "GET",
        path: UPLOAD_FILES_BY_HASH,
    },
    RouteDef {
        method: "GET",
        path: UPLOAD_ASSET,
    },
    RouteDef {
        method: "GET",
        path: ENGINE_SUGGESTION,
    },
    RouteDef {
        method: "POST",
        path: SEARCH_DOCS,
    },
    RouteDef {
        method: "GET",
        path: SEARCH_DOCS,
    },
    RouteDef {
        method: "GET",
        path: APPLICATION_TO_READ,
    },
    RouteDef {
        method: "GET",
        path: TENANTS,
    },
    RouteDef {
        method: "POST",
        path: TENANTS,
    },
    RouteDef {
        method: "GET",
        path: TENANTS_BY_ID,
    },
    RouteDef {
        method: "PUT",
        path: TENANTS_BY_ID,
    },
    RouteDef {
        method: "DELETE",
        path: TENANTS_BY_ID,
    },
    RouteDef {
        method: "GET",
        path: TENANT_MEMBERS,
    },
    RouteDef {
        method: "POST",
        path: TENANT_MEMBERS,
    },
    RouteDef {
        method: "PUT",
        path: TENANT_MEMBER_BY_ID,
    },
    RouteDef {
        method: "DELETE",
        path: TENANT_MEMBER_BY_ID,
    },
    RouteDef {
        method: "GET",
        path: TENANT_SUBSCRIPTIONS,
    },
    RouteDef {
        method: "POST",
        path: TENANT_SUBSCRIPTIONS,
    },
    RouteDef {
        method: "DELETE",
        path: TENANT_SUBSCRIPTION_BY_ID,
    },
    RouteDef {
        method: "GET",
        path: TENANT_QUOTA,
    },
    RouteDef {
        method: "POST",
        path: GATEWAY_CHAT,
    },
    RouteDef {
        method: "GET",
        path: GATEWAY_MODELS,
    },
    RouteDef {
        method: "GET",
        path: GATEWAY_PROVIDERS,
    },
    RouteDef {
        method: "POST",
        path: GATEWAY_PROVIDERS,
    },
    RouteDef {
        method: "PUT",
        path: GATEWAY_PROVIDERS_BY_ID,
    },
    RouteDef {
        method: "DELETE",
        path: GATEWAY_PROVIDERS_BY_ID,
    },
    RouteDef {
        method: "GET",
        path: GATEWAY_ADMIN_MODELS,
    },
    RouteDef {
        method: "POST",
        path: GATEWAY_ADMIN_MODELS,
    },
    RouteDef {
        method: "PUT",
        path: GATEWAY_ADMIN_MODELS_BY_ID,
    },
    RouteDef {
        method: "DELETE",
        path: GATEWAY_ADMIN_MODELS_BY_ID,
    },
    RouteDef {
        method: "GET",
        path: GATEWAY_USAGE,
    },
    RouteDef {
        method: "GET",
        path: GATEWAY_AUDIT,
    },
    RouteDef {
        method: "GET",
        path: SSO_CONNECTIONS,
    },
    RouteDef {
        method: "POST",
        path: SSO_CONNECTIONS,
    },
    RouteDef {
        method: "PUT",
        path: SSO_CONNECTIONS_BY_ID,
    },
    RouteDef {
        method: "DELETE",
        path: SSO_CONNECTIONS_BY_ID,
    },
    RouteDef {
        method: "GET",
        path: SSO_AUTHORIZE,
    },
    RouteDef {
        method: "GET",
        path: SSO_CALLBACK,
    },
];
