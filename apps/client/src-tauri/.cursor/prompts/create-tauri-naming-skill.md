# Create Skill Prompt: Tauri Naming Conventions

> 用途：复制下文整段，交给 Agent 按 create-skill 流程生成 Skill。  
> 约束：正文不含真实业务路径、仓库路径或具体业务模块名，避免 Skill 绑定某次实现细节。

---

请创建一个 Cursor Agent Skill，用于 Tauri + Rust + 前端 invoke 的命名规范。
Skill 必须是通用规范，不得引用任何具体项目路径、仓库名、业务模块名或真实文件位置。

## 目标

教 Agent 在 Tauri 项目中统一四层命名：

- IPC（前端 invoke 字符串）
- Command（Rust 注册函数）
- Service（业务逻辑）
- Entity（DTO / 载荷类型）

规范应简洁、可迁移到其他 Tauri 项目，避免绑定某一业务的实现细节。

## 触发场景

- 新增或重命名 Tauri command
- 重构 CRUD / IPC 接口
- 对齐前端 invoke 与 Rust rename
- Code review 中的命名问题
- Workspace / crate 拆分后的 command 组织

## 必须写入 SKILL.md 的规范

### 1. IPC 命令名（前端 invoke 的唯一标准）

格式：`namespace:action`

- 多词 action 使用 kebab-case
- 示例形态（仅作格式示范，非固定业务名）：
  - `resource:read`
  - `resource:write`
  - `resource:update`
  - `resource:remove`
  - `feature:update-mode`
  - `feature:update-badge`
  - `feature:take-pending`

规则：

- 命名空间与操作之间用 `:`，不用 `/`、不用 `_`
- IPC 禁止 snake_case（如 `resource_read`）
- IPC 禁止 camelCase（如 `updateBadge`）
- 状态变更优先用 `update-*`，不用 `set-*`
- 单词 action 保持小写单词（如 `read`、`write`、`open`、`close`）
- 修改 IPC 名时，必须同步更新所有前端 invoke 与注释示例

### 2. Rust Command 层

- Command crate 内函数名需带命名空间前缀，避免 Tauri 宏生成的内部符号冲突
  - 形态：`{namespace}_{action}`（Rust 侧 snake_case 可接受）
- IPC 对外名通过 `#[tauri::command(rename = "namespace:action")]` 绑定
- 当 Rust 函数名已与 IPC 完全一致且不会冲突时，可省略 rename；否则必须显式 rename
- handlers 优先用模块路径注册，避免 crate root 大量扁平 re-export

### 3. Service 层

- 保留 `to*` 动词风格（如 `toRead`、`toWrite`、`toUpdate`、`toRemove`）
- 不在 Service 层为了「Rust 惯用 snake_case」而改掉既有 `to*` 约定
- 辅助函数若项目已约定短名（如 serde 相关 helper），优先保留，不强行改成更长名字

### 4. Entity / DTO 层

- 载荷后缀约定：`*P` 表示参数枚举，`InsertR` 等表示结果类型（若项目已采用）
- CRUD 统一 `One | Many` 单入口：

```rust
match params {
    WriteP::One(p) => { /* single */ }
    WriteP::Many(ps) => { /* batch */ }
}
```

- 禁止同一资源 `insert` / `inserts` 双 command 双 service 入口
- 模块路径负责消歧，类型名尽量短，不在类型名里重复 namespace

### 5. 模块与基础设施命名

- 工具模块名表达职责，不用泛化桶名（如避免含义不清的模块名）
- 禁 `get` 前缀的包装函数（如 `get_*_path` → `*_path`）
- 避免同一资源提供多个等价 accessor（如 `connection()` 与 `getter()` 并存）

### 6. 四层对照（抽象模板）

| 层 | 形态 | 职责 |
|----|------|------|
| IPC | `namespace:action` | 前端 invoke |
| Command | `{namespace}_{action}` | Tauri 注册入口 |
| Service | `toAction` | 业务逻辑 |
| Entity | `ActionP::One \| Many` | 请求载荷 |

### 7. 重构完成检查

Agent 完成命名改动后必须：

1. 编译验证 workspace / 主 crate
2. grep 残留旧 IPC 名（snake_case、camelCase、旧 prefix）
3. 检查前端 `{ params: ... }` 是否与 Entity 定义一致
4. 更新注释与文档中的 invoke 示例

## Skill 结构

```
tauri-naming-conventions/
├── SKILL.md
├── ipc-patterns.md    # 可选：IPC 命名模式表
└── examples.md        # 可选：正误对比
```

## SKILL.md frontmatter 建议

```yaml
---
name: tauri-naming-conventions
description: >-
  Tauri 项目命名规范：IPC 使用 namespace:kebab-action；
  Command/Service/Entity 分层命名；CRUD 统一 One|Many 单入口。
  在新增/重命名 command、对齐 invoke、重构 IPC 或 review 命名时使用。
---
```

## examples.md 应包含的正误对比（只用抽象名）

**正确**

```ts
invoke('resource:update', { params: { key, change } })
invoke('feature:update-badge', { hasBadge: true })
invoke('feature:update-rects', { source, rects })
```

**错误**

```ts
invoke('resource_update', ...)        // IPC snake_case
invoke('feature:updateBadge', ...)    // IPC camelCase
invoke('feature/set-badge', ...)      // 用 / 或 set
invoke('resource:update', { id })     // params 形状不匹配 Entity
```

## 重要约束（必须遵守）

1. Skill 正文不得出现：
   - 具体仓库路径
   - 具体业务模块名
   - 「去参考某某业务文件如何实现」的指引
   - 指向真实源码位置的链接或路径
2. 只写命名规则与分层原则，不写「打开 X 文件对照实现」
3. 示例一律用抽象占位名：`resource`、`feature`、`namespace`
4. 规范保持简短优雅；名称不宜过长；优先用模块 namespace 消歧

请按 create-skill 流程生成 SKILL.md，并可选生成 ipc-patterns.md、examples.md。
