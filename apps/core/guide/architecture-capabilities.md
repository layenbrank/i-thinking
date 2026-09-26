# 能力边界（capability crates）

本仓库的服务端内核按**能力**切分成若干 crate（`apps/core/crates/*`），HTTP 层（`src/`，crate `service`）
只做协议与编排。边界不是靠约定，而是靠门禁 `bun run arch` 强制——违规即 CI 失败。

## 拓扑

```
                 ┌───────────────┐
                 │ service (api) │  actix-web / 路由 / DTO / 事务边界
                 └───┬───┬───┬───┘
      ┌──────────────┘   │   └──────────────┐
      ▼                  ▼                  ▼
 ┌─────────┐        ┌─────────┐        ┌─────────┐
 │identity │◀───────│  authz  │        │ billing │  … gateway / document / audit / notify
 └─────────┘        └─────────┘        └─────────┘
```

- 依赖方向单向：`service → 能力`、`authz → identity`；能力之间默认不互相依赖。
- 能力 crate 不含 Web 框架、不含 `service`，因此可以被 worker 二进制、测试、未来的独立服务直接复用。

| 能力 | 数据所有权 | 吸收的遗留对象 |
|------|-----------|---------------|
| identity | `auth` `tenant` `tenant_member` `sso_connection` | 目录 `src/services/{auth,user,tenant,sso}` |
| authz | —（无表） | 遗留角色判断散点（由 R3 棘轮逐个收敛：`src/guards/*`、`src/utils/jwt.rs` 等改为调用 authz） |
| billing | `subscription` `payment_order` | `src/services/{subscription,payment}` |
| gateway | `gateway_provider` `gateway_model` `gateway_usage` `gateway_audit` | `src/services/gateway` |
| document | `asset` `chunk` | `src/services/{upload,markdown,search}` |
| audit | `outbox` `consumed_event` | —（新建） |
| notify | —（无表） | —（新建） |

`src/services/{application,engine}` 是应用层编排（对话/智能体），归属 api 二进制，不进能力 crate。

## 门禁规则

声明的唯一来源是 [`scripts/capabilities.ts`](../scripts/capabilities.ts)，检查实现是
[`scripts/arch.ts`](../scripts/arch.ts)。运行：`cd apps/core && bun run arch`（CI 的 Architecture hygiene 步骤）。

| 规则 | 内容 | 违规示例 |
|------|------|---------|
| R1 | 能力 crate 的形态与依赖方向：必须在 `[workspace] members` 登记；不得依赖 `service` 或任何 Web 框架；依赖其他能力前必须先在 `dependsOn` 声明 | `crates/notify` 里写 `service = { path = ".." }` |
| R2 | 对外表面：`src/lib.rs`、`README.md`（含 `## 数据所有权`、`## 对外接口`）必备；每个 `pub mod` 必须在 `publicModules` 登记 | 在 `identity` 里加 `pub mod repository;` 而不更新声明 |
| R3 | 权限判定唯一入口：角色词汇（`Role::` / `Status::` / `.is_admin()` / 与 `"ADMIN"` 等字面量比较）只允许出现在 `crates/identity`（定义）与 `crates/authz`（判定） | 控制器里写 `if principal.role == "ADMIN"` |
| R4 | 表所有权唯一：同一张表只能被一个能力声明 | `asset` 同时出现在 document 与 gateway |
| R5 | 表所有权完整：`migration/src/*.rs` 建的表必须全部有归属，且声明里不能出现不存在的表 | 新增迁移表但没登记归属 |
| R6 | 遗留布局冻结：`src/services/` 不得新增模块（新能力一律建 crate）；标记 `status: 'migrated'` 的能力不得再留下 `absorbs` 路径 | 在 `src/services/` 下新建 `report/` |
| R7 | 租户作用域唯一入口：`tenant_tx` / `user_tx` / `order_tx` / `apply_*_scope` / `TenantScope::open` / `TenantScope::adopt` / `AccountScope::open` / `PaymentNotifyScope::open` 只允许出现在 `src/guards/` 与 `src/databases/scope.rs` | 在 `services/foo/service.rs` 里直接 `storage.tenant_tx(id)` 开作用域 |
| R8 | 平台特权唯一入口：`platform_tx` / `PlatformScope::open` 只允许出现在 `src/guards/`、`src/databases/scope.rs` 与 `PLATFORM_ENTRY_ALLOWED` 白名单 | 在 service 里直接 `storage.platform_tx()` 读跨租户汇总 |

## R3：零容忍

R3 没有棘轮、没有 allowlist：`src/` 与各能力 crate 里不得再出现任何角色/状态词汇。
在 `src/` 中**引用** `crates/identity` 的领域类型（`PlatformRole::User`、`AccountStatus::Active`）是允许的——
模式里的 `\bRole::` / `\bStatus::` 只匹配类型名本身，不会误伤 `PlatformRole::` / `TenantRole::` / `AccountStatus::`。
“定义”落在 `crates/identity`，“判定”落在 `crates/authz`。

## 棘轮（ratchet）

`TENANT_SCOPE_LEGACY` 是 R7 的棘轮，记录「尚未完全改造完、仍在自己开作用域」的文件。
它允许的例外只有两类：热点只读路径的私有短作用域包装器，以及待接入守卫的可信机器路径；
两者都必须在 `reason` 里写明为何暂时无法由调用方携带作用域。
新增的作用域入口必须**定义**在 `src/guards/`（如支付回调引导用的 `PaymentNotifyScope`），service 侧只留一个调用点。
上限高于实际值时只给出**提示**（非失败），提醒你下调上限——这样棘轮只会越拧越紧，不会悄悄放松。

`LEGACY_SERVICES`（`src/services/` 模块集合）同理：只能减少，删干净后提示把 `status` 改为 `migrated`。

R8 不是棘轮而是**正向白名单**：提权绕过行级隔离，因此没有「默认允许」这一档——
除了 `src/guards/` 与 `src/databases/scope.rs`，任何文件出现 `platform_tx` / `PlatformScope::open` 都是失败，
除非登记进 `PLATFORM_ENTRY_ALLOWED` 并写明用途（登记值高于实际时同样只提示下调）。

## 迁移一个能力的动作清单

1. 在 `crates/<name>` 实装领域逻辑（只依赖 `entity`/`migration` 与已声明的能力），对外接口写进 README。
2. `service` 侧改为调用能力 crate；所有 SQL 通过已限定租户的连接（见 [database.md](database.md)）。
3. 删除对应的 `src/services/<x>`，同步更新 `capabilities.ts`（`absorbs`、`LEGACY_SERVICES`）。
4. `bun run arch` 通过、`cargo test --workspace --lib` 通过，能力 `status` 推进到 `migrated`。
