# 数据库表协作

PostgreSQL 业务表采用 **camelCase 列名**（Rust entity 字段仍为 snake_case，通过 `column_name` 映射）。

## ER 关系

```mermaid
erDiagram
  auth ||--o| asset : avatar
  auth ||--o| auth : creator
  auth ||--o| auth : updater
  asset ||--o| auth : creator
  asset ||--o| auth : updater
  asset ||--o{ chunk : has
  chunk ||--o| auth : creator
  tenant ||--o{ tenant_member : has
  tenant ||--o{ subscription : has
  tenant ||--o{ sso_connection : has
  gateway_provider ||--o{ gateway_model : provides
  auth ||--o| subscription : creator
```

| 关系                                               | 说明                                 |
| -------------------------------------------------- | ------------------------------------ |
| `auth.avatar` → `asset.id`                         | 用户头像，删除 asset 时 SET NULL     |
| `auth.creator/updater` → `auth.id`                 | 账号审计，自引用                     |
| `asset.creator/updater` → `auth.id`                | 上传/资源审计                        |
| `chunk.assetID` → `asset.id`                       | 分片归属，删除 asset 时 CASCADE      |
| `chunk.creator` → `auth.id`                        | 分片审计                             |
| `tenant_member.tenantID` → `tenant.id`             | 成员归属，删除租户时 CASCADE         |
| `tenant_member.userID` → `auth.id`                 | 成员用户，删除账号时 CASCADE         |
| `sso_connection.tenantID` → `tenant.id`            | OIDC 连接归属，删除租户时 CASCADE    |
| `gateway_model.providerID` → `gateway_provider.id` | 模型所属供应商，删除供应商时 CASCADE |
| `subscription.tenantID` → `tenant.id`              | 订阅归属，删除租户时 CASCADE         |
| `subscription.creator/updater` → `auth.id`         | 订阅审计                             |

## auth 表

Entity：[`entity/src/auth.rs`](../entity/src/auth.rs)

| 列 (DB)    | 类型        | 说明                           |
| ---------- | ----------- | ------------------------------ |
| id         | uuid PK     | 用户 ID                        |
| username   | text UNIQUE | 登录名                         |
| password   | text        | 加密后密码                     |
| email      | text        | 邮箱                           |
| phone      | text UNIQUE | 手机号（可 NULL，唯一）        |
| age        | int         | 年龄                           |
| gender     | text        | MALE / FEMALE                  |
| birthday   | date        | 生日                           |
| avatar     | uuid FK     | → asset.id                     |
| role       | text        | USER / ADMIN，默认 USER        |
| status     | text        | ACTIVE / DISABLED，默认 ACTIVE |
| archivedAt | timestamptz | 归档时间                       |
| createdAt  | timestamptz | 创建时间                       |
| creator    | uuid FK     | → auth.id                      |
| updatedAt  | timestamptz | 更新时间                       |
| updater    | uuid FK     | → auth.id                      |
| expiresAt  | timestamptz | 过期时间                       |

**使用模块**：auth（登录/profile）、user（后台 CRUD）

## asset 表

Entity：[`entity/src/asset.rs`](../entity/src/asset.rs)

| 列 (DB)                                                            | 类型    | 说明                                                            |
| ------------------------------------------------------------------ | ------- | --------------------------------------------------------------- |
| id                                                                 | uuid PK | 资源 ID                                                         |
| tenantID                                                           | text    | 租户 ID（可空）                                                 |
| kind                                                               | text    | 类型，上传为 `upload`                                           |
| hash                                                               | text    | 文件 SHA256（64 位 hex），索引；prepare 时可先空串              |
| sha                                                                | text    | finalize 校验后的整文件 SHA（与 hash 一致）                     |
| size                                                               | bigint  | 文件总字节                                                      |
| index                                                              | bigint  | 租户内列表排序（默认 0）；≠ chunk.index                         |
| mime                                                               | text    | MIME                                                            |
| extension                                                          | text    | 扩展名                                                          |
| name                                                               | text    | 文件名                                                          |
| status                                                             | text    | PENDING / UPLOADING / COMPLETED / SUPERSEDED / FAILED / EXPIRED |
| visibility                                                         | text    | PRIVATE（默认）/ PUBLIC / RESTRICTED                            |
| viewers                                                            | jsonb   | RESTRICTED 时允许下载的用户 UUID 数组；其它可见性为 null        |
| chunk                                                              | int     | 分片大小（字节）                                                |
| total                                                              | int     | 分片总数                                                        |
| archivedAt / createdAt / creator / updatedAt / updater / expiresAt |         | 审计字段                                                        |

## chunk 表

Entity：[`entity/src/chunk.rs`](../entity/src/chunk.rs)

| 列 (DB)   | 类型        | 说明                              |
| --------- | ----------- | --------------------------------- |
| id        | uuid PK     | 分片记录 ID                       |
| assetID   | uuid FK     | → asset.id，CASCADE               |
| index     | int         | 分片序号（从 0）；与 assetID 唯一 |
| hash      | text        | 分片内容 SHA256（CAS key），索引  |
| size      | bigint      | 分片字节数                        |
| createdAt | timestamptz | 创建时间                          |
| creator   | uuid FK     | → auth.id                         |

**磁盘协作**（upload 模块）：

| 路径           | 用途                                   |
| -------------- | -------------------------------------- |
| `cas/{sha256}` | 分片内容寻址单副本（跨会话零拷贝复用） |

**使用模块**：upload（分片上传）、auth/user（avatar 联查）

## tenant 表 / subscription 表

`tenant`（多租户组织）与 `subscription`（个人租户付费档位）配套使用。

**`tenant.type`**：`PERSONAL`（个人租户，走免费/订阅档位配额）或 `TEAM`（团队租户，走全局兜底配额）。
租户**不再持有** `dailyTokenQuota` 字段——配额统一由「模型覆盖 > 订阅档位 > 免费档 / 全局兜底」表达，避免显式值与档位双轨并存。

Entity：[`entity/src/subscription.rs`](../entity/src/subscription.rs)

| 列 (DB)                                    | 类型        | 说明                                                 |
| ------------------------------------------ | ----------- | ---------------------------------------------------- |
| id                                         | uuid PK     | 订阅 ID                                              |
| tenantID                                   | uuid FK     | → tenant.id，CASCADE，索引                           |
| plan                                       | text        | 档位名，对应 `gateway.plan_daily_token_quota` 的 key |
| status                                     | text        | ACTIVE / CANCELED / EXPIRED，默认 ACTIVE             |
| expiresAt                                  | timestamptz | 到期时间；**NULL = 永久有效**                        |
| createdAt                                  | timestamptz | 订阅创建时间；**创建即生效**，故也是生效开始时间     |
| archivedAt / creator / updatedAt / updater |             | 审计字段                                             |

**生效判定**：`status = ACTIVE` 且 `archivedAt IS NULL` 且（`expiresAt IS NULL` 或 `expiresAt > now`）。
订阅**创建即生效**（`createdAt` 即生效时间），不支持预约未来开始时间，因此没有独立的 `startAt`。
同一租户同一时刻**最多一条生效订阅**——由部分唯一索引 `uidx_subscription_active`（`ON subscription ("tenantID") WHERE status = 'ACTIVE'`）在 DB 层强制；
开通/续订在一个事务内先把旧订阅标为 `EXPIRED`/`CANCELED`（未过期的 `expiresAt` 截断到当前时间）再插入新记录，取消则把 `expiresAt` 截断到当前时间。

**使用模块**：subscription（开通/续订/取消）、gateway（配额解析）

## tenant_member 表

Entity：[`entity/src/tenant_member.rs`](../entity/src/tenant_member.rs)

| 列 (DB)                                                            | 类型    | 说明                           |
| ------------------------------------------------------------------ | ------- | ------------------------------ |
| id                                                                 | uuid PK | 成员记录 ID                    |
| tenantID                                                           | uuid FK | → tenant.id，CASCADE           |
| userID                                                             | uuid FK | → auth.id，CASCADE             |
| role                                                               | text    | OWNER / ADMIN / MEMBER         |
| status                                                             | text    | ACTIVE / DISABLED，默认 ACTIVE |
| archivedAt / createdAt / creator / updatedAt / updater / expiresAt |         | 审计字段                       |

`(tenantID, userID)` 唯一（`uidx_tenant_member`）。
**使用模块**：tenant（成员 CRUD）、sso（回调时按连接所属租户建成员）

## gateway_provider / gateway_model 表

Entity：[`entity/src/gateway_provider.rs`](../entity/src/gateway_provider.rs)、[`entity/src/gateway_model.rs`](../entity/src/gateway_model.rs)

| 列 (DB)                                                            | 类型    | 说明                                                     |
| ------------------------------------------------------------------ | ------- | -------------------------------------------------------- |
| **gateway_provider.id**                                            | uuid PK | 供应商 ID                                                |
| tenantID                                                           | uuid    | 租户级供应商；NULL = 平台默认，索引                      |
| kind                                                               | text    | openai / anthropic / deepseek / qwen / zhipu / ollama    |
| name / baseURL                                                     | text    | 展示名与上游基址                                         |
| apiKeyEnc                                                          | text    | 上游 API Key，AES-256-GCM 密文；空 = 无密钥（如 ollama） |
| status                                                             | text    | ACTIVE / DISABLED，默认 ACTIVE                           |
| **gateway_model.id**                                               | uuid PK | 模型 ID                                                  |
| providerID                                                         | uuid FK | → gateway_provider.id，CASCADE                           |
| tenantID                                                           | uuid    | 租户级模型；NULL = 平台默认，索引                        |
| name / label                                                       | text    | 模型标识（如 gpt-4o）与展示名                            |
| allowRoles                                                         | jsonb   | 允许调用的角色数组；NULL = 全角色放行                    |
| enabled                                                            | boolean | 默认 true                                                |
| dailyTokenQuota                                                    | bigint  | 模型级日配额；0 = 继承租户（默认 0）                     |
| archivedAt / createdAt / creator / updatedAt / updater / expiresAt |         | 审计字段（两表同）                                       |

`apiKeyEnc` 的加密密钥来自 `security.aes_key`。
**使用模块**：gateway（供应商/模型管理、转发时解析）

## gateway_usage / gateway_audit 表

Entity：[`entity/src/gateway_usage.rs`](../entity/src/gateway_usage.rs)、[`entity/src/gateway_audit.rs`](../entity/src/gateway_audit.rs)

这两张是**追加型**表，**不设外键**（避免删除模型/租户时影响历史）。

| 列 (DB)                                       | 类型        | 说明                          |
| --------------------------------------------- | ----------- | ----------------------------- |
| **gateway_usage.id**                          | uuid PK     | 用量 ID                       |
| tenantID                                      | uuid        | 可空，索引                    |
| userID                                        | uuid        | 调用者，索引                  |
| providerID / modelID                          | uuid        | 供应与模型，索引              |
| promptTokens / completionTokens / totalTokens | bigint      | 默认 0                        |
| status                                        | text        | OK / QUOTA / UPSTREAM / ERROR |
| latencyMs                                     | bigint      | 默认 0                        |
| createdAt                                     | timestamptz | 索引                          |
| **gateway_audit.id**                          | uuid PK     | 审计 ID                       |
| tenantID                                      | uuid        | 可空                          |
| actor                                         | uuid        | 操作者，索引                  |
| action / resource                             | text        | 动作与资源                    |
| detail                                        | jsonb       | 详情，可空                    |
| ip                                            | text        | 可空                          |
| createdAt                                     | timestamptz | 索引                          |

用量另同步写入 ES 索引 `gateway.usage_es_index`（默认 `gateway_usage`）。
**使用模块**：gateway（转发落库/审计，后台用量与审计查询）

## sso_connection 表

Entity：[`entity/src/sso_connection.rs`](../entity/src/sso_connection.rs)

| 列 (DB)                                                            | 类型    | 说明                           |
| ------------------------------------------------------------------ | ------- | ------------------------------ |
| id                                                                 | uuid PK | 连接 ID                        |
| tenantID                                                           | uuid FK | → tenant.id，CASCADE           |
| provider                                                           | text    | oidc / saml（saml 预留）       |
| issuer                                                             | text    | OIDC Issuer                    |
| clientID                                                           | text    | 客户端 ID                      |
| clientSecretEnc                                                    | text    | 客户端密钥，AES-256-GCM 密文   |
| redirectUri                                                        | text    | 回调地址                       |
| status                                                             | text    | ACTIVE / DISABLED，默认 ACTIVE |
| archivedAt / createdAt / creator / updatedAt / updater / expiresAt |         | 审计字段                       |

**使用模块**：sso（连接 CRUD、OIDC 授权码流程）

## 审计字段约定

`archivedAt`、`createdAt`、`creator`、`updatedAt`、`updater`、`expiresAt` 在 auth / asset 上语义一致：

- **createdAt / creator**：创建时间与创建者
- **updatedAt / updater**：最后更新
- **archivedAt**：软归档/失败标记
- **expiresAt**：过期时间（上传任务默认 24h；订阅到期，NULL = 永久有效）

## 租户隔离（RLS）

带租户列的业务表由 PostgreSQL **行级安全（RLS）** 兜底：即使某条 SQL 漏写 `WHERE "tenantID" = ?`，也读不到别的租户的行。

- 判定函数 `app_current_tenant_id()` / `app_current_user_id()`：分别读取会话变量 `app.tenant_id` / `app.user_id`；
  未设置、或值不是合法 uuid 时一律返回 `NULL`（fail-closed）
- 策略名统一为 `tenant_isolation`，`USING` 与 `WITH CHECK` 用同一表达式，所以**没有作用域时写入同样被拒**
- 逐表 `ENABLE` + `FORCE ROW LEVEL SECURITY`：`FORCE` 让**表属主**也受约束，单账号直连部署下不会失效；
  代价是**连接账号不得是超级用户，也不得带 `BYPASSRLS`**，否则 RLS 形同虚设
- 作用域是**事务局部**的：`set_config('app.tenant_id' | 'app.user_id', $1, true)`（第三个参数 `true` = 只在本事务生效），
  提交/回滚后自动失效，不会残留在池化连接上串到下一个请求

| 表 | 判定依据 |
| --- | --- |
| tenant | 读：`id = app_current_tenant_id()`，或 `id` 属于「我（`app_current_user_id()`）的 ACTIVE 成员行」；写：只允许 `id = app_current_tenant_id()` |
| tenant_member | 读：`"tenantID" = app_current_tenant_id() OR "userID" = app_current_user_id()`（账号作用域下只列出自己的成员关系）；写：只允许本租户 |
| subscription / payment_order / sso_connection / gateway_usage / gateway_audit / outbox | `"tenantID" = app_current_tenant_id()` |
| asset | `"tenantID" = app_current_tenant_id()::text`（该列是 text，显式转型） |
| gateway_provider / gateway_model | 读：`"tenantID" IS NULL OR "tenantID" = app_current_tenant_id()`（保留全局目录行）；写：只允许本租户 |
| auth / chunk | **无 RLS**：账号是全局身份；chunk 没有租户列，隔离经 asset 传递 |

Rust 侧分两层：

- [`src/databases/scope.rs`](../src/databases/scope.rs) 提供机制：`Storage::tenant_tx` / `user_tx` 开一个事务并设好对应作用域
  （`apply_tenant_scope` / `apply_user_scope`），之后的读写复用这条事务，业务代码不必再逐条手写租户条件。
- [`src/guards/tenant.rs`](../src/guards/tenant.rs) 的 `TenantCtx` 是**业务代码进入租户作用域的唯一入口**：
  `enter` 先开作用域事务、再在作用域内读成员关系（读不到即「不是成员」；平台管理员例外，属运维通道，须在业务侧留审计），
  之后 handler 只用 `ctx.tx()` 读写、用 `ctx.require(..)` 判权限、用 `ctx.commit()` 收尾。
  建租户走 `open_new`：作用域指向尚未落库的新租户 id，`tenant` / `tenant_member` 的写策略自约束在这个作用域内，
  因此**建租户不再需要特权连接**。
- 账号作用域（`user_tx`）只服务「列出我所属的租户」这类跨租户只读，不参与租户内业务。
- 成员关系读取（`identity::persistence::membership`）只在作用域事务内调用；`tenant_member.role` 字面量无法识别时报错而非降级。

跨租户写入会以 SQLSTATE `42501` 失败，用 [`src/utils/db.rs`](../src/utils/db.rs) 的 `is_row_security_violation` 判别。
仍需特权连接的系统任务只剩迁移、全局目录行与 outbox 发布器，不靠放宽策略。

端到端验证见 [`tests/tenant_isolation.rs`](../tests/tenant_isolation.rs)：库名必须含 `test`（防误连生产），
未设置 `TEST_DATABASE_URL` 时整个文件跳过。

## outbox / consumed_event

事务性发件箱：业务行与「待发布事件」在同一事务里落库，避免「业务提交了但事件丢了」。

| 表 | 用途 | 关键列 |
| --- | --- | --- |
| outbox | 待投递的领域事件 | `seq`（`bigint` identity，插入时不要赋值）、`aggregate`（聚合类型）+ `aggregateID`、`eventType`、`schemaVersion`、`payload`（jsonb）、`traceparent`、`tenantID`、`createdAt`、`publishedAt`（NULL = 未发布） |
| consumed_event | 消费幂等记录 | 主键 `(consumer, eventID)`，另有 `consumedAt`；重复插入撞唯一键即表示已消费 |

- 两表**没有外键**：事件要能独立于聚合行存在，也别让重建表时把事件连带删掉
- `outbox.seq` 是 `GENERATED BY DEFAULT AS IDENTITY`（`auto_increment` 只能用在主键上，故它只是普通列）；
  entity 里映射为普通 `i64`，**插入必须用 `NotSet`**，由数据库分配
- 扫描未发布事件用 `idx_outbox_unpublished`（部分索引），按聚合回放用 `idx_outbox_aggregate`
- outbox 同样受 RLS 约束；`tenantID` 为 NULL 表示系统级事件，只有特权连接能写、能读

## 数据所有权

| 数据 | 归属 | 写入口 |
| --- | --- | --- |
| auth | 全局 | 认证模块 |
| tenant / tenant_member / subscription / payment_order / sso_connection | 单一租户 | 各自模块，必须带租户作用域 |
| asset / chunk | 单一租户（chunk 经 asset 传递） | 上传模块 |
| gateway_provider / gateway_model | 租户行或全局行（`"tenantID" IS NULL`） | 网关管理；全局行属特权写入 |
| gateway_usage / gateway_audit | 单一租户 | 网关 |
| outbox / consumed_event | 单一租户，或 `tenantID IS NULL` 的系统事件 | 各模块只写自己的事件 |

跨模块**不直接改别人的表**：需要对方数据时调对方的公开接口，或消费对方写出的 outbox 事件。

## 跨模块流程：头像绑定

```mermaid
sequenceDiagram
  participant Client
  participant Upload
  participant Asset as asset表
  participant Auth
  participant AuthTbl as auth表

  Client->>Upload: POST /upload/prepare (image/png)
  Upload->>Asset: INSERT status=PENDING
  Client->>Upload: POST /upload/chunk
  Note over Upload: INSERT chunk + 写 cas/{hash}
  Client->>Upload: POST /upload/finalize
  Upload->>Asset: UPDATE status=COMPLETED
  Client->>Auth: PUT /auth/profile avatar=assetID
  Auth->>Asset: 校验 COMPLETED + creator=当前用户
  Auth->>AuthTbl: UPDATE avatar FK
```

## 迁移

全部表由**单一代际**迁移 [`migration/src/000001_20260819.rs`](../migration/src/000001_20260819.rs) 建出（含 `auth` 的 `phone` / `gender` / `birthday` / `avatar`、`outbox` / `consumed_event`，以及 RLS 函数与全部策略）；
改 schema 直接改这个文件，**不追加新版本**。重建：

```bash
cd apps/core && bun run migrate:fresh   # 等价于 cargo run -p migration -- fresh
```

两条落地约束：

- `up` 的建表列表和 `down` 的 drop 列表必须一一对应，漏一张就会在重建后残留旧结构（`down` 是 `cascade`）
- `fresh` 是**先 drop 再重建**，所以改完 schema 后**已有环境的库必须重建**才会带上新列与新策略，增量升级不做保证

列名与 `DeriveIden` 的注意事项见 [`migration/README.md`](../migration/README.md#列名约定)。

详见 [`migration/README.md`](../migration/README.md)。
