# authz · 授权决策

全系统**唯一**的权限判定入口：输入身份上下文与「资源 + 操作」，输出放行 / 拒绝及原因。

## 数据所有权

无表。本 crate 不持久化任何状态：策略表编译在代码里，未来引入角色配置表时记在此处。

## 对外接口

- `Resource` / `Action` / `Permission`：受保护资源与操作词汇。
- `authorize(&Principal, Permission) -> Decision`、`require(...) -> Result<(), Denied>`：判定入口。
- `Decision` / `DenyReason` / `Denied`：结论与拒绝原因，可直接进日志与审计事件。
- 策略表：角色 → 权限集合，约束为「成员 ⊆ 管理员 ⊆ 所有者」，由单元测试穷举校验。

## 边界约束

- 不依赖 HTTP 框架，也不依赖 `sea-orm`：本 crate 是纯决策，读写数据库由调用方在同一事务内完成。
- 不依赖 `service`；依赖方向由 `bun run arch` 的 R1 强制。
- 判定 fail-closed：无当前租户上下文、角色字面量未知、策略表未覆盖，一律拒绝。
- 平台管理员是**带审计义务的运维通道**：仅在已选定租户上下文时生效，调用方必须记录审计事件。
- 任何 `role == "..."` 式的散落判断都视为违规（R3），必须改走本 crate。

## 迁移状态

- 已迁入：RBAC 策略与判定入口（含穷举与单调性测试）。
- 待迁入（P3b）：把 `service/src/guards/{auth,permission,public}.rs`、`service/src/services/{user,tenant,sso}` 中散落的角色判断替换为 `require(...)`。
- 迁移点（ReBAC）：策略表形状是「角色 → 权限集合」，出现资源共享 / 组织树 / 代理授权需求时替换内部求值，调用方无需改动。
