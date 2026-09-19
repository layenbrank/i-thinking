# Gateway

路由前缀：`/api/v1/gateway`

## 概述

OpenAI 兼容的**模型网关**：转发对话补全请求到上游供应商，并负责**日 token 配额**、**用量记录**与**审计**。

| 能力        | 说明                                                                    |
| ----------- | ----------------------------------------------------------------------- |
| 对话转发    | `POST /chat/completions`，`stream: true` 时 SSE 直传，否则返回原始 JSON |
| 可用模型    | 按平台角色 / 租户角色过滤后返回                                         |
| 供应商管理  | 上游 base_url 与（加密）API Key 的 CRUD                                 |
| 模型管理    | 模型 ↔ 供应商绑定、允许角色、单模型配额覆盖                             |
| 配额        | Redis 日窗计数，按 UTC 午夜重置                                         |
| 用量 / 审计 | 落库 + 写入 ES 用量索引                                                 |

## 与同域其他模块的区别

- [`tenant`](../tenant/README.md)：提供租户身份与角色；本模块据此决定配额来源与可见模型。
- [`subscription`](../subscription/README.md)：提供「此刻生效的档位」，本模块查配置得到档位配额。
- [`search`](../search/README.md)：面向业务文档检索；本模块只把**用量事件**写入 ES。

## 路由一览

用户面：

| 方法 | 路径                               | 鉴权 | 说明                          |
| ---- | ---------------------------------- | ---- | ----------------------------- |
| POST | `/api/v1/gateway/chat/completions` | JWT  | OpenAI 兼容转发（SSE / JSON） |
| GET  | `/api/v1/gateway/models`           | JWT  | 当前身份可用的模型            |

后台（平台 ADMIN）：

| 方法         | 路径                                | 说明              |
| ------------ | ----------------------------------- | ----------------- |
| GET / POST   | `/api/v1/gateway/providers`         | 供应商列表 / 新建 |
| PUT / DELETE | `/api/v1/gateway/providers/{id}`    | 供应商更新 / 删除 |
| GET / POST   | `/api/v1/gateway/admin/models`      | 模型列表 / 新建   |
| PUT / DELETE | `/api/v1/gateway/admin/models/{id}` | 模型更新 / 删除   |
| GET          | `/api/v1/gateway/usage`             | 用量查询（分页）  |
| GET          | `/api/v1/gateway/audit`             | 审计查询（分页）  |

## 鉴权说明

- 用户面：`Auth::isRequired()`，并额外校验模型 `allowRoles` 与租户角色（`role_allowed`）。
- 后台：`Auth::admin()`，仅平台 ADMIN。

## 配额

日配额按下列优先级取**第一个命中项**，Redis 键 `gateway:quota:{scope}:{id}:{yyyy-mm-dd}`：

| 优先级 | 来源                                                          |
| ------ | ------------------------------------------------------------- |
| 1      | `gateway_model.dailyTokenQuota > 0`（单模型覆盖）             |
| 2      | `gateway.plan_daily_token_quota[plan]`（个人租户 + 生效订阅） |
| 3      | `gateway.free_daily_token_quota`（个人租户无有效订阅）        |
| 4      | `gateway.daily_token_quota`（团队租户 / 无租户身份）          |

作用域：有租户按 `Tenant(id)`，无租户按 `User(id)`。触顶返回 `400006`。

## 数据表

| 表                 | Entity                                                                      | 说明                                                                                                                                                                                          |
| ------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway_provider` | [`entity/src/gateway_provider.rs`](../../../entity/src/gateway_provider.rs) | `tenantID`（NULL=平台默认）、`kind / name / baseURL / apiKeyEnc / status`                                                                                                                     |
| `gateway_model`    | [`entity/src/gateway_model.rs`](../../../entity/src/gateway_model.rs)       | `providerID`、`tenantID`、`name / label / allowRoles / enabled / dailyTokenQuota`                                                                                                             |
| `gateway_usage`    | [`entity/src/gateway_usage.rs`](../../../entity/src/gateway_usage.rs)       | `tenantID`（可空）、`userID`、`providerID`、`modelID`、`promptTokens` / `completionTokens` / `totalTokens`、`status`（OK / QUOTA / UPSTREAM / ERROR）、`latencyMs`、`createdAt`；追加型无外键 |
| `gateway_audit`    | [`entity/src/gateway_audit.rs`](../../../entity/src/gateway_audit.rs)       | `tenantID`（可空）、`actor`、`action`、`resource`、`detail`、`ip`、`createdAt`                                                                                                                |

各表的完整列定义见 [`guide/database.md`](../../../guide/database.md#gateway_provider--gateway_model-表)。

- `apiKeyEnc` 为 AES-256-GCM 密文（`security.aes_key`）。
- 用量事件另写入 ES 索引 `gateway.usage_es_index`（默认 `gateway_usage`），可经 `gateway.audit_enabled` 关闭审计落库。

## 实现架构

```
GatewayModule::configure
  ├── scope("") .wrap(Auth::isRequired())
  │     ├── POST /chat/completions → GatewayController::chat → GatewayService::chat_json / chat_stream
  │     └── GET  /models           → GatewayController::models
  └── scope("") .wrap(Auth::admin())
        └── providers / admin/models / usage / audit → GatewayController → GatewayService
                                                └── repository::record_usage / record_audit / index_usage
```

解析链路（`GatewayService::resolve`）：

```
find_model（租户内优先，其次平台默认）
  → 校验 enabled / allow_roles / provider.status
  → 取 provider.api_key_enc 并解密
  → personal_quota（订阅档位 > 免费档；团队租户回落全局）
  → quota_key_for(scope)
```

## 错误码

| code            | 场景                                              |
| --------------- | ------------------------------------------------- |
| 200003          | 参数无效                                          |
| 300006 / 300007 | 权限不足 / 访问被拒绝（模型 `allowRoles` 不允许） |
| 400001          | 供应商或模型不存在                                |
| 400006          | 配额已用尽                                        |
| 600001          | 数据库错误                                        |
| 600003          | 配额缓存异常                                      |
