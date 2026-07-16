---
name: naming-conventions
description: >-
  Tauri 项目命名规范：IPC 使用 namespace:kebab-action；
  Command/Service/Entity 分层命名；CRUD 统一 One|Many 单入口。
  在新增/重命名 command、对齐前端 invoke、重构 IPC、crate 拆分后整理 handlers、
  或 code review 命名问题时使用。
---

# Naming Conventions (Tauri)

统一四层命名，使前端 `invoke` 与 Rust command / service / entity 可预测、可迁移。

| 层 | 形态 | 职责 |
|----|------|------|
| IPC | `namespace:action` | 前端 invoke 唯一标准 |
| Command | `{namespace}_{action}` | Tauri 注册入口 |
| Service | `toAction` | 业务逻辑 |
| Entity | `ActionP::One \| Many` | 请求载荷 |

抽象示例一律用 `resource`、`feature`、`namespace`。不要把规范绑定到某一业务模块或仓库路径。

## When to apply

- 新增或重命名 Tauri command
- 重构 CRUD / IPC
- 对齐前端 invoke 与 Rust `rename`
- 命名相关 code review
- workspace / crate 拆分后整理 command 注册

## 1. IPC（前端 invoke）

格式：`namespace:action`

- 多词 action 用 kebab-case
- 命名空间与操作之间只用 `:`，不用 `/`、不用 `_`
- 禁止 IPC snake_case（如 `resource_read`）
- 禁止 IPC camelCase（如 `updateBadge`）
- 状态变更优先 `update-*`，不用 `set-*`
- 单词 action 保持小写（`read`、`write`、`open`、`close`）
- 修改 IPC 名时，同步所有前端 invoke 与注释示例

示例形态：

- `resource:read` / `resource:write` / `resource:update` / `resource:remove`
- `feature:update-mode` / `feature:update-badge` / `feature:take-pending`

更完整的模式表见 [ipc-patterns.md](ipc-patterns.md)。

## 2. Command（Rust）

- 函数名带命名空间前缀，避免 Tauri 宏生成的内部符号跨模块冲突：`{namespace}_{action}`（Rust snake_case）
- 对外 IPC 名用 `#[tauri::command(rename = "namespace:action")]` 绑定
- 仅当 Rust 函数名已与 IPC 完全一致且不会冲突时，可省略 `rename`；否则必须显式 `rename`
- handlers 优先按模块路径注册，避免 crate root 大量扁平 re-export

```rust
#[tauri::command(rename = "resource:update")]
pub async fn resource_update(/* ... */) { /* ... */ }
```

## 3. Service

- 保留 `to*` 动词风格：`toRead`、`toWrite`、`toUpdate`、`toRemove`
- 不要为了「Rust 惯用 snake_case」改掉既有 `to*` 约定
- 项目已约定的短名辅助函数（如 serde helper）优先保留，不强行拉长

## 4. Entity / DTO

- 载荷后缀：`*P` 表示参数枚举；`InsertR` 等表示结果类型（若项目已采用）
- CRUD 统一 `One | Many` 单入口；禁止同一资源 `insert` / `inserts` 双 command、双 service
- 基数落在 Entity，不落在 IPC：不要拆成 `resource:insert-one` / `resource:insert-many` 两条 invoke
- 模块路径负责消歧；类型名尽量短，不要在类型名里重复 namespace

```rust
match params {
    WriteP::One(p) => { /* single */ }
    WriteP::Many(ps) => { /* batch */ }
}
```

## 5. 模块与基础设施

- 工具模块名表达职责，避免含义不清的泛化桶名
- 禁止 `get` 前缀包装函数（`get_*_path` → `*_path`）
- 避免同一资源多个等价 accessor（如同时保留 `connection()` 与 `getter()`）

## 6. 命名改动工作流

1. 定 IPC 名：`namespace:action`
2. 定 Command：`{namespace}_{action}` + `rename`
3. 定 Service：`toAction`
4. 定 Entity：`ActionP::One | Many`（CRUD）
5. 同步前端 invoke 参数形状（常为 `{ params: ... }`）
6. 跑完成检查

正误对照见 [examples.md](examples.md)。

## 7. 完成检查

命名改动完成后：

1. 编译验证 workspace / 主 crate
2. grep 残留旧 IPC（snake_case、camelCase、旧 prefix、`/`、`set-*`）
3. 确认前端载荷形状与 Entity 一致
4. 更新注释与文档中的 invoke 示例
