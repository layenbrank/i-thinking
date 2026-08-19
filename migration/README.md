# Migrations

SeaORM 官方迁移 crate。记账表为 `migration`（覆盖默认的 `seaql_migrations`）。

## CLI

```bash
cargo install sea-orm-cli@^2.0
```

`.env` 使用 `DATABASE_URL`（与 sea-orm-cli 一致）。

```bash
# 在仓库根目录
sea-orm-cli migrate status
sea-orm-cli migrate up
sea-orm-cli migrate down
sea-orm-cli migrate fresh

# 或直接跑本 crate
cargo run -p migration -- up
cargo run -p migration -- status
```

生成新迁移：

```bash
sea-orm-cli migrate generate NAME_OF_MIGRATION
```

应用启动时会调用 `Migrator::up`，一般不必单独跑 CLI。

基线 `000001_20260819` 会 **DROP** 已有 `auth` / `asset` 后重建 camelCase 单词语列 schema。面向全新空库；不清理历史表名。记账表 `migration` 由 Migrator 维护，不要在业务迁移里 DROP。
