# identity · 身份与租户

账号、租户、租户成员关系，以及请求身份上下文 `Principal` 的唯一构造来源。

## 数据所有权

| 表 | 说明 |
| --- | --- |
| `auth` | 账号（全局身份，跨租户唯一）。 |
| `tenant` | 租户。 |
| `tenant_member` | 账号与租户的关联及其租户内角色。 |
| `sso_connection` | 租户的 SSO / OIDC 连接与凭证。 |

## 对外接口

- `TenantId` / `UserId`：带类型的标识（UUID newtype，序列化为字符串）。
- `PlatformRole` / `TenantRole`：角色词汇，`FromStr` 只接受已知字面量（大小写不敏感），未知值返回 `UnknownRole` 而非默认角色。
- `TenantMembership` / `Principal`：一次请求的身份上下文，构造后只读传递。
- `account::{Account, AccountStatus}`：账号快照（标识、用户名、平台角色、状态），账号状态与平台角色的**唯一权威来源**（库为准，令牌只证明身份）。
- `persistence::{find_account, membership, PersistError}`：账号与成员关系的只读查询。`membership` 依赖行级安全策略，必须在已进入租户作用域的事务（`apply_tenant_scope`）内调用。
- 迁移中点：`persistence` 目前只有读取入口；写入侧（注册/认证、租户创建、成员增删与角色变更、SSO 连接管理）仍待迁入。

## 边界约束

- 不依赖 HTTP 框架：请求头、Cookie、JWT 解析属于 `service`（api 二进制）的职责，本 crate 只接受已解析的领域类型。
- 不依赖 `service`；依赖方向由 `bun run arch` 的 R1 强制。
- 权限判断一律调用 `authz`，本 crate 内不得出现角色字面量比较（R3）。
- 跨 crate 只能引用对方 README「对外接口」列出的公开项（R2）。
- 表所有权唯一，且由 `bun run arch` 与迁移脚本比对（R4）。

## 迁移状态

- 已迁入：领域类型与角色词汇（RBAC 决策的输入）。
- 已迁入：账号快照与账号/成员关系的读取入口（`account`、`persistence`），`service/src/guards/session.rs` 已成为请求身份的构造点。
- 待迁入（P3b）：账号与成员关系的写入逻辑，来源为 `service/src/services/{auth,user,tenant,sso}`；迁完后这些目录必须删除。
