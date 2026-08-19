# 数据库字段约定

## 列命名

- PostgreSQL 列：**camelCase**，尽量**单个词语**（`creator` 而非 `created_by_user_id`）
- Rust entity：`snake_case` + `column_name` 映射

```rust
#[sea_orm(column_name = "createdAt")]
pub created_at: DateTimeWithTimeZone,
```

## 通用审计字段

新建业务表默认包含：

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | uuid PK | 主键 |
| `createdAt` | timestamptz NOT NULL | 创建时间 |
| `creator` | uuid NULL FK → auth.id | 创建人 |
| `updatedAt` | timestamptz NOT NULL | 更新时间 |
| `updater` | uuid NULL FK → auth.id | 最后修改人 |
| `archivedAt` | timestamptz NULL | 归档/软删时间 |
| `expiresAt` | timestamptz NULL | 过期时间 |

FK 删除策略参考现有迁移：`ON DELETE SET NULL`，`ON UPDATE CASCADE`。

## 迁移

- 路径：`migration/src/`
- 运行：`cargo run -p migration -- up`
- 同步更新：`entity/src/{table}.rs`、`guide/database.md`、相关模块 README

## JSON 与 DB 对齐

API 响应 timestamp 用毫秒 `i64`；日期字符串 `YYYY-MM-DD`。
DB 存 `timestamptz` / `date`，在 `schema` 的 `From` impl 中转换。
