# 03 — Database：迁移、Entity、CRUD 载荷

Crate：`thinking-database`（`apps/client/src-tauri/crates/database`）。

## 迁移

- **仅注册** [`migrations_v001`](../../../apps/client/src-tauri/crates/database/src/migrations/migrations_v001.rs)
- 迁移记录表名：`migrations`（非默认 `seaql_migrations`）
- API：`migration::run` / `rollback` / `check`

### v001 表清单

| 表 | Entity 模块 | 备注 |
|----|-------------|------|
| `mirror` | `entity/mirror.rs` | |
| `magneticTile` | `entity/magnetic_tile.rs` | 表名 camelCase |
| `asset` | `entity/asset.rs` | |
| `user` | （无独立 entity 模块） | |
| `notification` | （无） | |
| `comment` | （无） | |
| `countdown` | `entity/countdown.rs` | 含 seed 行 |
| `reminder` | `entity/reminder.rs` | 须先于 calendar（FK） |
| `calendar` | `entity/calendar.rs` | FK → `reminder(id)`，ON DELETE SET NULL |

时间戳统一为 **毫秒**（`timestamp_millis`）。

## Entity 约定

1. `DeriveEntityModel` → `Model` / `ActiveModel` / `Entity` / `Column`
2. JSON：`#[serde(rename_all = "camelCase")]`
3. DB 列：Rust `snake_case` 字段 + `#[sea_orm(column_name = "camelCase")]`
4. 特例：`reminderID` 用显式 `serde(rename)` + `column_name`

## CRUD 参数模式（标准资源）

基数落在 Entity，**不**拆成 `insert-one` / `insert-many` 两条 IPC：

| 类型 | 含义 |
|------|------|
| `Read` / `ReadP` | 查询过滤；`One` \| `Many` |
| `Write` / `WriteP` | 创建（无 id；Service 生成 UUID） |
| `Change` + `Update` / `UpdateP` | 部分更新：`{ key, change }` |
| `RemoveP` | `One(String)` \| `Many(Vec<String>)` |

`WriteP` / `UpdateP` / `ReadP` / `RemoveP` 均为 `#[serde(untagged)]` 的 One/Many。

### Change 可空字段三态

对可清 NULL 的字段使用 `Option<Option<T>>`：

| JSON / Rust | 含义 |
|-------------|------|
| 字段省略 / `None` | 不修改 |
| `null` / `Some(None)` | 清成 NULL |
| 有值 / `Some(Some(v))` | 设为 v |

示例（reminder）：`dueAt`、`fireTime`、`snoozeUntil`、`archivedAt`。

**注意**：前端 TypeScript 里常写成 `dueAt?: number | null`；传给 serde 时「省略」与「显式 null」语义不同——更新时若要清空，需传 `null`；若不想改，不要带该键。

## 审计字段

多数业务表具备：

| 字段 | 含义 |
|------|------|
| `createdAt` | 创建时间（ms） |
| `updatedAt` | 最后更新（ms） |
| `archivedAt` | `NULL` = 活跃；有值 = 终态（完成 / 软删 / 一次性关闭等） |

读接口默认排除已归档（`archived: true` 才包含）。硬删走 `remove`。

## 非标准模块（勿照抄）

| 模块 | 差异 |
|------|------|
| `countdown` | `upsert` / 无统一 `*P`；偏单行配置 |
| `asset` | IPC 可能用 `insert` 而非 `write` |

新增「列表型业务资源」时，优先对齐 reminder / calendar / mirror / magnetic-tile 的 WriteP 模式。

## Reminder / Calendar 字段速查

完整语义见 [05-reminder-calendar.md](./05-reminder-calendar.md)。Entity 源码：

- [`entity/reminder.rs`](../../../apps/client/src-tauri/crates/database/src/entity/reminder.rs)
- [`entity/calendar.rs`](../../../apps/client/src-tauri/crates/database/src/entity/calendar.rs)
