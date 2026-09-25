use super::common::{
    EmptyEnvelope, Exception, ModelEnvelope, ModelListEnvelope, PlansEnvelope, ProviderEnvelope,
    ProviderListEnvelope, SelfQuotaEnvelope,
};
use crate::services::gateway::schema::{
    ChatCompletionsP, ModelUpdateP, ModelWriteP, ProviderUpdateP, ProviderWriteP,
};

#[utoipa::path(
    post,
    path = "/api/v1/gateway/chat/completions",
    tag = "Gateway",
    operation_id = "gateway.chat",
    summary = "模型转发（OpenAI 兼容）",
    description = "需要 JWT。body 兼容 OpenAI chat/completions；stream=true 返回 SSE，否则返回原始 JSON。",
    security(("bearer_auth" = [])),
    request_body(content = ChatCompletionsP, description = "OpenAI 兼容请求"),
    responses(
        (status = 200, description = "成功（raw OpenAI 响应）", body = Object),
        (status = 200, description = "鉴权/白名单/配额错误", body = Exception),
    )
)]
pub fn chat_doc() {}

#[utoipa::path(
    get,
    path = "/api/v1/gateway/models",
    tag = "Gateway",
    operation_id = "gateway.models",
    summary = "可用模型列表",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "成功", body = ModelListEnvelope),
        (status = 200, description = "未登录", body = Exception),
    )
)]
pub fn models_doc() {}

#[utoipa::path(
    get,
    path = "/api/v1/gateway/quota/me",
    tag = "Gateway",
    operation_id = "gateway.quotaMe",
    summary = "自助配额（只读）",
    description = "返回当前身份此刻的日窗用量与上限，口径与聊天热路径同源（模型覆盖 > 档位 > 免费档）。\
        带 `X-Tenant-ID` 且确为成员时按租户作用域回答，否则按用户作用域。",
    security(("bearer_auth" = [])),
    params(
        ("model" = Option<String>, Query, description = "目录里的模型名；缺省或 auto 时按身份级配额回答"),
    ),
    responses(
        (status = 200, description = "成功", body = SelfQuotaEnvelope),
        (status = 200, description = "未登录", body = Exception),
    )
)]
pub fn quota_me_doc() {}

#[utoipa::path(
    get,
    path = "/api/v1/gateway/plans",
    tag = "Gateway",
    operation_id = "gateway.plans",
    summary = "档位目录",
    description = "可开通档位（档位名 + 日 token 配额）与免费档基线，来自服务端配置而非数据库。",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "成功", body = PlansEnvelope),
        (status = 200, description = "未登录", body = Exception),
    )
)]
pub fn plans_doc() {}

#[utoipa::path(
    get,
    path = "/api/v1/gateway/providers",
    tag = "Gateway",
    operation_id = "gateway.providers",
    summary = "供应商列表",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "成功", body = ProviderListEnvelope),
        (status = 200, description = "权限不足", body = Exception),
    )
)]
pub fn providers_doc() {}

#[utoipa::path(
    post,
    path = "/api/v1/gateway/providers",
    tag = "Gateway",
    operation_id = "gateway.providerWrite",
    summary = "创建供应商",
    security(("bearer_auth" = [])),
    request_body(content = ProviderWriteP, description = "供应商信息"),
    responses(
        (status = 200, description = "成功", body = ProviderEnvelope),
        (status = 200, description = "权限不足", body = Exception),
    )
)]
pub fn provider_write_doc() {}

#[utoipa::path(
    put,
    path = "/api/v1/gateway/providers/{id}",
    tag = "Gateway",
    operation_id = "gateway.providerUpdate",
    summary = "更新供应商",
    security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "供应商 ID")),
    request_body(content = ProviderUpdateP, description = "供应商信息"),
    responses(
        (status = 200, description = "成功", body = ProviderEnvelope),
        (status = 200, description = "未找到", body = Exception),
    )
)]
pub fn provider_update_doc() {}

#[utoipa::path(
    delete,
    path = "/api/v1/gateway/providers/{id}",
    tag = "Gateway",
    operation_id = "gateway.providerRemove",
    summary = "删除供应商",
    security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "供应商 ID")),
    responses(
        (status = 200, description = "成功", body = EmptyEnvelope),
        (status = 200, description = "未找到", body = Exception),
    )
)]
pub fn provider_remove_doc() {}

#[utoipa::path(
    get,
    path = "/api/v1/gateway/admin/models",
    tag = "Gateway",
    operation_id = "gateway.modelsAdmin",
    summary = "模型列表（后台）",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "成功", body = ModelListEnvelope),
        (status = 200, description = "权限不足", body = Exception),
    )
)]
pub fn models_admin_doc() {}

#[utoipa::path(
    post,
    path = "/api/v1/gateway/admin/models",
    tag = "Gateway",
    operation_id = "gateway.modelWrite",
    summary = "创建模型",
    security(("bearer_auth" = [])),
    request_body(content = ModelWriteP, description = "模型信息"),
    responses(
        (status = 200, description = "成功", body = ModelEnvelope),
        (status = 200, description = "权限不足", body = Exception),
    )
)]
pub fn model_write_doc() {}

#[utoipa::path(
    put,
    path = "/api/v1/gateway/admin/models/{id}",
    tag = "Gateway",
    operation_id = "gateway.modelUpdate",
    summary = "更新模型",
    security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "模型 ID")),
    request_body(content = ModelUpdateP, description = "模型信息"),
    responses(
        (status = 200, description = "成功", body = ModelEnvelope),
        (status = 200, description = "未找到", body = Exception),
    )
)]
pub fn model_update_doc() {}

#[utoipa::path(
    delete,
    path = "/api/v1/gateway/admin/models/{id}",
    tag = "Gateway",
    operation_id = "gateway.modelRemove",
    summary = "删除模型",
    security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "模型 ID")),
    responses(
        (status = 200, description = "成功", body = EmptyEnvelope),
        (status = 200, description = "未找到", body = Exception),
    )
)]
pub fn model_remove_doc() {}

#[utoipa::path(
    get,
    path = "/api/v1/gateway/usage",
    tag = "Gateway",
    operation_id = "gateway.usage",
    summary = "用量报表",
    security(("bearer_auth" = [])),
    params(
        ("tenantID" = Option<String>, Query, description = "租户 ID"),
        ("modelID" = Option<String>, Query, description = "模型 ID"),
        ("from" = Option<i64>, Query, description = "起始毫秒时间戳"),
        ("to" = Option<i64>, Query, description = "结束毫秒时间戳"),
        ("page" = Option<u32>, Query, description = "页码"),
        ("size" = Option<u32>, Query, description = "每页条数"),
    ),
    responses(
        (status = 200, description = "成功", body = Object),
        (status = 200, description = "权限不足", body = Exception),
    )
)]
pub fn usage_doc() {}

#[utoipa::path(
    get,
    path = "/api/v1/gateway/audit",
    tag = "Gateway",
    operation_id = "gateway.audit",
    summary = "审计日志",
    security(("bearer_auth" = [])),
    params(
        ("tenantID" = Option<String>, Query, description = "租户 ID"),
        ("page" = Option<u32>, Query, description = "页码"),
        ("size" = Option<u32>, Query, description = "每页条数"),
    ),
    responses(
        (status = 200, description = "成功", body = Object),
        (status = 200, description = "权限不足", body = Exception),
    )
)]
pub fn audit_doc() {}
