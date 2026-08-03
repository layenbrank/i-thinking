# Tauri Command / Database

本专题说明 Client Tauri 侧 **command（IPC）** 与 **database（SeaORM / SQLite）** 的分层设计、正确用法，以及 Schema Reminder 统一后的破坏性改动摘要。

与 VitePress 站点 [`apps/docs`](../../../apps/docs) 分离；命名细则见 skill：[`naming-conventions`](../../../apps/client/src-tauri/.cursor/skills/naming-conventions/SKILL.md)。

## 文档地图

| 文档 | 内容 |
|------|------|
| [01-changelog-schema-unify.md](./01-changelog-schema-unify.md) | 本次破坏性改动：删 alarm、单 v001、calendar 重命名 |
| [02-architecture.md](./02-architecture.md) | 三 crate 分层与调用链、Storage、worker |
| [03-database.md](./03-database.md) | 迁移、Entity、`WriteP` / `UpdateP`、审计字段 |
| [04-command-ipc.md](./04-command-ipc.md) | IPC 命名、CRUD 命令表、前端 invoke |
| [05-reminder-calendar.md](./05-reminder-calendar.md) | Reminder / Calendar 语义与响铃（重点） |
| [06-pitfalls.md](./06-pitfalls.md) | 旧名对照与易错清单 |

## 推荐读法

| 场景 | 路径 |
|------|------|
| 新人上手 | `02` → `04` → `03` → `05` |
| 改模型 / 加字段 | `03` → `05` → `01`（看历史决策） |
| 排查响铃 / 重复通知 | `05`（worker）→ `06` |
| 对照旧代码 / 迁移残留 | `01` → `06` |

## 冷启动注意

Schema 已合并为**仅** `migrations_v001`，与旧库不兼容。开发机需删除本地 `i-thinking.db` 后冷启动（通常在 `%APPDATA%` 下应用数据目录）。详见 [01](./01-changelog-schema-unify.md)。
