# Gateway

路由前缀：`/api/v1/gateway`

## 概述

OpenAI 兼容的**模型网关**：转发对话补全请求到上游供应商，并负责**日 token 配额**、**用量记录**与**审计**。

| 能力        | 说明                                                                    |
| ----------- | ----------------------------------------------------------------------- |
| 对话转发    | `POST /chat/completions`，`stream: true` 时 SSE 直传，否则返回原始 JSON |
| 可用模型    | 按平台角色 / 租户角色过滤后返回                                         |
| 自动路由    | 目录内置 `auto`：请求 `model=auto` 时按「租户内优先、支持工具优先」挑一条 |
| 供应商管理  | 上游 base_url 与（加密）API Key 的 CRUD                                 |
| 模型管理    | 模型 ↔ 供应商绑定、允许角色、能力声明、上下文窗口、单模型配额覆盖       |
| 配额        | Redis 日窗计数，按 UTC 午夜重置；`GET /quota/me` 自助只读查询 |
| 档位目录    | `GET /plans` 下发可开通档位与免费档基线（源自配置，不落库）      |
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
| GET  | `/api/v1/gateway/quota/me`         | JWT  | 自助配额（只读，含今日已用）  |
| GET  | `/api/v1/gateway/plans`            | JWT  | 档位目录（可开通档位 + 免费档）|

后台（平台 ADMIN）：

| 方法         | 路径                                | 说明              |
| ------------ | ----------------------------------- | ----------------- |
| GET / POST   | `/api/v1/gateway/providers`         | 供应商列表 / 新建 |
| PUT / DELETE | `/api/v1/gateway/providers/{id}`    | 供应商更新 / 删除 |
| GET / POST   | `/api/v1/gateway/admin/models`      | 模型列表 / 新建   |
| PUT / DELETE | `/api/v1/gateway/admin/models/{id}` | 模型更新 / 删除   |
| GET          | `/api/v1/gateway/usage`             | 用量查询（分页）  |
| GET          | `/api/v1/gateway/audit`             | 审计查询（分页）  |

## 目录契约（`GET /models` 与 `GET /admin/models`）

两个接口返回同一组字段，客户端**只按目录渲染**，不写死任何模型名：

| 字段            | 说明                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `name`          | 请求 `model` 字段要用的值（上游约定的名字）                                                       |
| `label`         | 界面上显示的名字                                                                                 |
| `capabilities`  | `{ tools?, reasoning?, vision? }`，客户端据此决定是否挂工具、要不要显示推理/图片入口；未声明时客户端按「工具可用、推理与视觉未知」兜底 |
| `contextWindow` | 上下文窗口（token）；未声明则不下发                                                               |
| `providerName`  | 上游供应商展示名。用户面也下发 —— 普通用户读不到 `/providers`（ADMIN），无法自己把 `providerID` 解析成名字 |

三个可选字段都用 `skip_serializing_if = "Option::is_none"` 收尾：客户端契约是「可缺省」，不是 `null`。

### 自动路由（`auto`）

用户面目录的**首项固定是 `auto`**（`label = 自动选择`，`id` / `providerID` 为空串，时间戳为 0）：
它不是一条数据库记录，而是网关承诺的一个入口，所以：

- `POST /chat/completions` 传 `model = "auto"`（大小写不敏感）时走 `pick_auto_model`：
  平台或租户内 `enabled` → `role_allowed` 过滤 → 排序取首个，排序键依次为
  `tenantID.is_some()`（租户内优先）、`!supports_tools`（支持工具优先）、`created_at`、`name`；无候选回 `400001 模型不存在`。
- `capabilities.tools` 缺省视为**支持工具**（与客户端 opt-out 口径一致），所以自动路由不会因为模型没声明能力就把它排除掉。
- 命中后按普通模型走完整解析链路（配额、用量、审计都记在**被选中的那条模型**上），并把实际用的模型名写回响应里的 `model`。
- `auto` 是保留名：后台 `POST /admin/models` 建同名模型回 `200003`（`auto 为网关保留的自动路由模型名`）。
- `PUT /admin/models/{id}` 的 `capabilities`：给了就整体覆盖（**空对象 `{}` = 清空该列**）；`contextWindow ≤ 0` 也等于清空。
  非对象或非布尔的 `capabilities` 值回 `200003`（如 `capabilities.tools 必须是布尔值`）。

## 鉴权说明与作用域

每个 handler 的第一件事是**进入作用域**（详见 [guide/architecture-cross-cutting.md](../../../guide/architecture-cross-cutting.md)）：
领域函数只收作用域对象，拿不到「裸连接」，可见行由数据库行级策略兜底（见 [guide/database.md](../../../guide/database.md)）。

| 面     | 鉴权                       | 进入的作用域                                            | 可见行                                        |
| ------ | -------------------------- | ------------------------------------------------------- | --------------------------------------------- |
| 用户面 | `Auth::isRequired()`       | 带 `X-Tenant-ID` → `TenantCtx`；否则 `AccountScope`     | 本租户私有行 + 全局行（无租户时只有全局行）   |
| 运维面 | `Auth::admin()`            | `PlatformScope`（特权角色，`BYPASSRLS`）                | 全局行与**所有**租户的行                      |

- `X-Tenant-ID` 不再是「盲信通行证」而是**选择器**：带了就必须是该租户的成员（或平台管理员），否则 403；
  不带则落在账号作用域。用户面四个接口口径一致（目录、聊天、自助配额、档位）。
- 运维面写入只写全局目录行（`tenantID IS NULL`）；改 / 删租户私有行一律 `400001`（不存在），
  不会「静默成功却一行没动」。
- 用户面额外校验模型 `allowRoles` 与租户角色（`role_allowed`）；同名模型下租户私有行优先于全局行。

## 配额

日配额按下列优先级取**第一个命中项**，Redis 键 `gateway:quota:{scope}:{id}:{yyyy-mm-dd}`：

| 优先级 | 来源                                                          |
| ------ | ------------------------------------------------------------- |
| 1      | `gateway_model.dailyTokenQuota > 0`（单模型覆盖）             |
| 2      | `gateway.plan_daily_token_quota[plan]`（个人租户 + 生效订阅） |
| 3      | `gateway.free_daily_token_quota`（个人租户无有效订阅）        |
| 4      | `gateway.daily_token_quota`（团队租户 / 无租户身份）          |

作用域：有租户按 `Tenant(id)`，无租户按 `User(id)`。触顶返回 `400006`。

`GET /quota/me` 是上面这套口径的**只读镜像**（同一个 `resolve_quota` + 同一把 Redis 键），
供客户端显示「今日已用 / 剩余 / 重置时刻」，因此不存在「界面数字与服务端拦截不一致」的问题：

- `?model=<name>` 命中该模型的覆盖配额时按模型回答（`source=MODEL`）；缺省或 `auto` 按身份级回答
  —— `auto` 要等网关挑完才知道具体模型，客户端应在选完模型后再查一次。
- 只读接口与聊天/目录共用同一条作用域入口：`X-Tenant-ID` 是选择器而非通行证，不是成员就 403，
  不会把他人租户的档位与用量透出去。
- 计数只读，不写 Redis、不落库、不记审计。

`GET /plans` 的档位只有「名字 + 日配额」两个事实，都出自 `gateway.plan_daily_token_quota`
（不落库、无档位表），按配额升序返回，并附带免费档基线 `freeDailyTokenQuota`：
客户端据此渲染可选档位，而不是让用户手填档位名。档位为空表示平台未开放任何付费档位。

## 数据表

| 表                 | Entity                                                                      | 说明                                                                                                                                                                                          |
| ------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway_provider` | [`entity/src/gateway_provider.rs`](../../../entity/src/gateway_provider.rs) | `tenantID`（NULL=平台默认）、`kind / name / baseURL / apiKeyEnc / status`                                                                                                                     |
| `gateway_model`    | [`entity/src/gateway_model.rs`](../../../entity/src/gateway_model.rs)       | `providerID`、`tenantID`、`name / label / allowRoles / enabled / dailyTokenQuota`、`capabilities` / `contextWindow`                                                                           |
| `gateway_usage`    | [`entity/src/gateway_usage.rs`](../../../entity/src/gateway_usage.rs)       | `tenantID`（可空）、`userID`、`providerID`、`modelID`、`promptTokens` / `completionTokens` / `totalTokens`、`status`（OK / QUOTA / UPSTREAM / ERROR）、`latencyMs`、`createdAt`；追加型无外键 |
| `gateway_audit`    | [`entity/src/gateway_audit.rs`](../../../entity/src/gateway_audit.rs)       | `tenantID`（可空）、`actor`、`action`、`resource`、`detail`、`ip`、`createdAt`                                                                                                                |

各表的完整列定义见 [`guide/database.md`](../../../guide/database.md#gateway_provider--gateway_model-表)。

四张表都 `ENABLE` + **`FORCE`** 行级安全策略：供应商与模型按 `tenantID IS NULL OR tenantID = 当前租户`
可读、只允许写本租户行；用量与审计按 `tenantID = 当前租户 OR (tenantID IS NULL AND 属主 = 当前用户)`。
平台面靠 `PlatformScope` 的 `BYPASSRLS` 角色跨租户读、只写全局行。

- `apiKeyEnc` 为 AES-256-GCM 密文（`security.aes_key`）。
- 用量事件另写入 ES 索引 `gateway.usage_es_index`（默认 `gateway_usage`），可经 `gateway.audit_enabled` 关闭审计落库。

## 实现架构

```
GatewayModule::configure
  └── scope("/gateway") .wrap(Auth::isRequired())
        ├── POST /chat/completions → GatewayController::chat  → Target::enter → GatewayService::prepare → chat_json / chat_stream
        ├── GET  /models           → GatewayController::models → GatewayService::list_models(tx, principal)
        ├── GET  /quota/me         → GatewayController::quota_me → GatewayService::self_quota(tx, principal)
        └── admin_routes（每条各自 .wrap(Auth::admin())）
              providers / admin/models / usage / audit → PlatformScope::open → GatewayService::*
                                                       └── repository::record_usage / record_audit / index_usage
```

管理面按 `web::resource` **逐条**注册，不再套第二层 `web::scope("")`：同一层级出现两个空前缀 scope 时，
actix 的 `ResourceMap` 只在第一个匹配节点内继续查找，后注册的 scope 永远不会命中（管理面曾因此全部 404）。

解析链路（`GatewayService::prepare`）：

```
Target::enter（X-Tenant-ID → 租户作用域 / 账号作用域；作用域即行可见性）
  → find_model（同名时租户私有行优先，其次全局行）；model = "auto" 时先 pick_auto_model 补全成具体模型名
  → 校验 enabled / allow_roles / provider.status
  → 取 provider.api_key_enc 并解密
  → resolve_quota（模型覆盖 > 订阅档位 > 免费档 > 全局兜底）
  → Prepared{model, provider, api_key, scope, quota_limit, …}
```

## 错误码

| code            | 场景                                              |
| --------------- | ------------------------------------------------- |
| 200003          | 参数无效（含 `capabilities` 非布尔、占用保留名 `auto`） |
| 300006 / 300007 | 权限不足 / 访问被拒绝（模型 `allowRoles` 不允许） |
| 400001          | 供应商或模型不存在（`model=auto` 时表示没有候选模型） |
| 400006          | 配额已用尽                                        |
| 600001          | 数据库错误                                        |
| 600003          | 配额缓存异常                                      |
