//! 路由常量 — module.rs 与 OpenAPI path doc 共用，防止路径漂移。

pub struct RouteDef {
    pub method: &'static str,
    pub path: &'static str,
}

// --- 系统 ---
pub const HEALTH: &str = "/api/health";

// --- Auth ---
pub const AUTH_SIGNIN: &str = "/api/v1/auth/signin";
pub const AUTH_SIGNUP: &str = "/api/v1/auth/signup";
pub const AUTH_PROFILE: &str = "/api/v1/auth/profile";

// --- User ---
pub const USERS: &str = "/api/v1/users";
pub const USERS_BY_ID: &str = "/api/v1/users/{id}";

// --- Upload ---
pub const UPLOAD_PREPARE: &str = "/api/v1/upload/prepare";
pub const UPLOAD_CHUNK: &str = "/api/v1/upload/chunk";
pub const UPLOAD_FINALIZE: &str = "/api/v1/upload/finalize";
pub const UPLOAD_PROGRESS: &str = "/api/v1/upload/progress/{id}";
pub const UPLOAD_CANCEL: &str = "/api/v1/upload/cancel/{id}";
pub const UPLOAD_FILES: &str = "/api/v1/upload/files/{hash}";

// --- Engine ---
pub const ENGINE_SUGGESTION: &str = "/api/v1/engine/suggestion";

// --- Magnetic Tile ---
pub const APPLICATION_TO_READ: &str = "/api/v1/application/toRead";

/// 所有对外路由（不含静态页 `/`、`/index.html`）
pub const ALL_ROUTES: &[RouteDef] = &[
    RouteDef {
        method: "GET",
        path: HEALTH,
    },
    RouteDef {
        method: "POST",
        path: AUTH_SIGNIN,
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
        path: ENGINE_SUGGESTION,
    },
    RouteDef {
        method: "GET",
        path: APPLICATION_TO_READ,
    },
];
