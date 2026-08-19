# Migrations

SeaORM 官方迁移 crate。记账表为 `seaql_migrations`。

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

基线 `m20260819_000001_init_schema` 会 **DROP** 旧的 `users` / `uploads` / `auth` / 自定义 `migration` 表后重建 snake_case schema。
