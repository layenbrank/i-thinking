use crate::services::auth::schema::{ProfileP, SigninP, SignupP};
use super::common::{EmptyEnvelope, Exception, ProfileEnvelope, SigninEnvelope, SignupEnvelope};

/// 用户登录
#[utoipa::path(
    post,
    path = "/api/v1/auth/signin",
    tag = "Auth",
    operation_id = "auth.signin",
    summary = "用户登录",
    description = "公开接口，成功后返回 JWT token。HTTP 状态码始终为 200，业务结果见 body.code。\n\n\
        联调默认账号：`admin` / `123456`。成功后请将 `data.token` 写入环境变量 `token`。",
    request_body(
        content = SigninP,
        description = "登录凭证",
        example = json!({
            "username": "admin",
            "password": "123456"
        })
    ),
    responses(
        (status = 200, description = "登录成功（code=200000）", body = SigninEnvelope),
        (status = 200, description = "凭证无效（code=500301）", body = Exception),
    )
)]
pub fn signin_doc() {}

/// 用户注册
#[utoipa::path(
    post,
    path = "/api/v1/auth/signup",
    tag = "Auth",
    operation_id = "auth.signup",
    summary = "用户注册",
    description = "公开接口，注册成功后自动登录并返回 JWT token。\n\n\
        示例账号：`admin` / `123456`（若已存在请改用其他用户名）。",
    request_body(
        content = SignupP,
        description = "注册凭证",
        example = json!({
            "username": "admin",
            "password": "123456"
        })
    ),
    responses(
        (status = 200, description = "注册成功（code=200000）", body = SignupEnvelope),
        (status = 200, description = "用户名已存在等业务错误", body = Exception),
    )
)]
pub fn signup_doc() {}

/// 获取当前用户 Profile
#[utoipa::path(
    get,
    path = "/api/v1/auth/profile",
    tag = "Auth",
    operation_id = "auth.toRead",
    summary = "获取个人信息",
    description = "需要 JWT 鉴权，返回当前登录用户的 profile。",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "获取成功（code=200000）", body = ProfileEnvelope),
        (status = 200, description = "未登录（code=300001）", body = Exception),
    )
)]
pub fn toRead_doc() {}

/// 更新当前用户 Profile
#[utoipa::path(
    put,
    path = "/api/v1/auth/profile",
    tag = "Auth",
    operation_id = "auth.toUpdate",
    summary = "更新个人信息",
    description = "需要 JWT 鉴权，可更新 email、phone、gender、birthday、avatar 等字段。",
    security(("bearer_auth" = [])),
    request_body(
        content = ProfileP,
        description = "可更新字段（均为可选）",
        example = json!({
            "email": "admin@example.com",
            "phone": "13800138000",
            "gender": "MALE",
            "birthday": "1990-01-01",
            "avatar": "550e8400-e29b-41d4-a716-446655440000"
        })
    ),
    responses(
        (status = 200, description = "更新成功（code=200000）", body = ProfileEnvelope),
        (status = 200, description = "未登录或参数错误", body = Exception),
    )
)]
pub fn toUpdate_doc() {}

/// 登出（JWT 黑名单）
#[utoipa::path(
    post,
    path = "/api/v1/auth/signout",
    tag = "Auth",
    operation_id = "auth.signout",
    summary = "用户登出",
    description = "需要 JWT。将当前 token 写入 Redis 黑名单直至过期，之后该 token 不可再用。",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "登出成功（code=200000）", body = EmptyEnvelope),
        (status = 200, description = "未登录或缓存异常", body = Exception),
    )
)]
pub fn signout_doc() {}
