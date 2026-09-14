# Prisma → Drizzle 替换方案

> 目标：把 studio 的访问层从 Prisma 换成 **Drizzle ORM**，引擎保持 **better-sqlite3**（采用量最高），
> 迁移改为 Drizzle 官方的**运行时 `migrate()`**（Electron 内可用，已实测 Prisma CLI 不可用）。
> 库文件位置与表结构**不得变化**：Tauri 版（另一架构的同实现）与 studio 共用同一路径与 schema。

## 0. 选型依据（调研结论）

| 层     | 现状                     | 目标                  | 依据                                                             |
| ------ | ------------------------ | --------------------- | ---------------------------------------------------------------- |
| 引擎   | better-sqlite3           | **不变**              | 周下载 7.7M，同类第一（第二名 4 倍+）                            |
| 访问层 | Prisma 7                 | **Drizzle ORM**       | 周下载 16.4M；官方支持启动时 `migrate(db, { migrationsFolder })` |
| 迁移   | 自研 runner + 自有记账表 | Drizzle 官方 migrator | 去掉自研机制（不再有 `_studio_migrations`）                      |
| 配置   | electron-store           | 不变                  | 周下载 1.0M                                                      |

Prisma 被替换的唯一原因是**迁移体系面向上服务器/CI**：官方推荐 `migrate deploy` 在发布流水线执行，
v7 无编程式迁移 API，且实测其 CLI 在 Electron 宿主内卡死/空转（普通 Node 下正常）。

## 1. 类型映射规则

| Prisma                             | Drizzle（sqlite-core）                                                                | 说明                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `String @id`                       | `text('col').primaryKey()`                                                            |                                                                                                                                |
| `String` / `String?`               | `text('col').notNull()` / `text('col')`                                               |                                                                                                                                |
| `String @default("x")`             | `text('col').notNull().default('x')`                                                  |                                                                                                                                |
| `BigInt` / `BigInt?`（毫秒时间戳） | `integer('col', { mode: 'number' }).notNull()` / `integer('col', { mode: 'number' })` | ms < 2^53，用 `number` 正好贴合 `packages/shared` 的 `updatedAt: number`，且免去 BigInt 不能 JSON 序列化的麻烦                 |
| `Int` / `Int?`                     | `integer('col').notNull()` / `integer('col')`                                         |                                                                                                                                |
| `Boolean @default(x)`              | `integer('col', { mode: 'boolean' }).notNull().default(x)`                            | 库里仍是 0/1，与 Tauri 版一致                                                                                                  |
| `Float` / `Float?`                 | `real('col').notNull()` / `real('col')`                                               | SQLite REAL                                                                                                                    |
| `enum Shape/Direction`             | `text('col', { enum: [...] })`                                                        | Drizzle 的 `enum` 只影响 TS 类型，库里仍是 TEXT → 与 Rust 侧一致                                                               |
| JSON 字符串列                      | `text('col')`                                                                         | **不用** `text({ mode: 'json' })`：保持"库存字符串、边界层解析"的语义，与 Rust 的 `toSerialize` 行为一致，且不会被历史脏值炸掉 |

## 2. 逐表映射

### 2.1 Prisma model → Drizzle 表

| Prisma              | Drizzle                               | 关键点                                                                           |
| ------------------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| `Auth`              | `sqliteTable('Auth', …)`              | studio 自有（示例仓储）                                                          |
| `Mirror`            | `sqliteTable('mirror', …)`            | `index` 是普通列（不是关键字）                                                   |
| `MagneticTile`      | `sqliteTable('magneticTile', …)`      | **不加** `mirrorID` 外键，只建索引（Rust/Tauri 版没有该 FK，加了会改变删除语义） |
| `Asset`             | `sqliteTable('asset', …)`             | 含 `version`（对齐 Rust DDL）                                                    |
| `Overlay`           | `sqliteTable('overlay', …)`           | `z` 是 ms/BIGINT → `integer`                                                     |
| `Reminder`          | `sqliteTable('reminder', …)`          |                                                                                  |
| `Calendar`          | `sqliteTable('calendar', …)`          | `reminderID` FK：`onDelete: 'set null'`                                          |
| `Countdown`         | `sqliteTable('countdown', …)`         |                                                                                  |
| `AiWorkspace`       | `sqliteTable('aiWorkspace', …)`       |                                                                                  |
| `AiWorkspaceFolder` | `sqliteTable('aiWorkspaceFolder', …)` | FK `onDelete: 'cascade'`                                                         |
| `AiSession`         | `sqliteTable('aiSession', …)`         | FK `onDelete: 'set null'`                                                        |
| `AiMessage`         | `sqliteTable('aiMessage', …)`         | FK `onDelete: 'cascade'`                                                         |
| `AiProvider`        | `sqliteTable('aiProvider', …)`        |                                                                                  |

### 2.2 索引（照 `migrations_v001.rs` 逐个搬）

```
magneticTile(mirrorID)
asset(hash), asset(filePath)
reminder(dueAt), reminder(fireTime), reminder(enabled), reminder(archivedAt)
calendar(startAt), calendar(reminderID)
overlay(archivedAt), overlay(tenantID)
aiWorkspace(archivedAt)
aiWorkspaceFolder(workspaceID)
aiSession(workspaceID), aiSession(updatedAt)
aiMessage(sessionID), aiMessage(createdAt)
aiProvider(kind)
```

> 注：Prisma 版额外加了 `magneticTile(collectionID)`、`magneticTile(component)`（Rust 没有）。本次**与 Rust 对齐**，不再保留；
> 若 studio 查询确实需要，再单独加（加索引不影响 Tauri 版读写）。

## 3. 迁移方案

1. **不用手写 SQL**：`drizzle-kit generate` 从 Drizzle schema 生成首个迁移
   （输出形如 `drizzle/0000_init.sql` + `drizzle/meta/_journal.json` + snapshot；具体命名以生成结果为准）。
2. **种子数据复用现有文件**：把现在 `prisma/migrations/*_seed/migration.sql`（由 `scripts/sync-seed.mjs` 从 Rust 迁移抽取的 138 条 `INSERT OR IGNORE`）
   放进 `drizzle-kit generate --custom --name=seed` 生成的**自定义迁移**里。脚本 `sync-seed.mjs` 的输出路径改到 drizzle 目录。
3. **schema 对齐校验（必须自动化）**：
   - 用 Prisma 迁移建一个库 A（现有 `prisma/migrations` 交付前先留一份）
   - 用 Drizzle 迁移建一个库 B
   - 逐表 diff：`sqlite_master`（表、索引）+ `PRAGMA table_info`（列名/类型/notnull/默认值）+ `PRAGMA foreign_key_list`
   - 结论必须为：表/列/默认值/FK 完全一致；**允许差异**：索引名、列顺序
4. **兼容既有库**（用户从 Tauri 版切过来）：Drizzle 的 migrator 用 `__drizzle_migrations` 记账；
   对已存在结构的库需要"采纳基线"（等价于 Prisma 的 `migrate resolve --applied`）：
   保留一个**极薄的前置检查**（约 20 行）：库已有业务表且无 `__drizzle_migrations` → 写入基线记录后交给 Drizzle migrator。
   `__drizzle_migrations` 的 hash 计算方式**实现时用一次真实迁移实测确认**（`SELECT * FROM __drizzle_migrations` 即可看出），不猜。
   > studio 尚未发版，若确认无存量用户，此分支可整体省略。

## 4. 运行时改造（`src/plugins/database.ts`）

```ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

function findClient() {
  const dbPath = findSharedDatabasePath() // 不变：Local/identifier/i-thinking.db
  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL') // 与 Tauri 版一致的 pragma 组
  sqlite.pragma('synchronous = NORMAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('busy_timeout = 5000')
  migrate(drizzle(sqlite), { migrationsFolder: join(findAppRoot(), 'drizzle') })
  return drizzle(sqlite)
}
```

- **删除** `src/plugins/migrations.ts` 与 `migrations.test.ts`（Drizzle 官方 migrator 接管，自研 runner 不再需要）
- `Repository`（Auth CRUD）改成 Drizzle 查询：`db.select().from(auth).orderBy(auth.id)` 等
- 退出时 `sqlite.close()`（`dispose()` 钩子）
- 可选（上次调研的零风险项）：打开时写 `PRAGMA application_id`、迁移后写 `PRAGMA user_version`

## 5. 删除/改动清单

| 动作 | 路径                                                                                                                                                                             |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 删   | `apps/studio/prisma/`（schema、migrations、config）、`apps/studio/generated/`（Prisma Client）、`apps/studio/scripts/` 中 Prisma 专用内容                                        |
| 新增 | `apps/studio/drizzle/schema.ts`（或按领域分文件）、`apps/studio/drizzle.config.ts`、`apps/studio/drizzle/`（迁移产物）                                                           |
| 改   | `package.json`：移除 `prisma`/`@prisma/client`/`@prisma/adapter-better-sqlite3`，加 `drizzle-orm`/`drizzle-kit`；`postinstall` 去掉 `prisma generate`（保留 `electron-rebuild`） |
| 改   | `forge/packager.ts`：asar keep 列表 `/prisma` → `/drizzle`（迁移 SQL + journal 必须随包）                                                                                        |
| 改   | `apps/studio/tsconfig.json`：删除 `@generated/*` 路径别名                                                                                                                        |
| 改   | `i-thinking.code-workspace`：删除 `prisma.schemaPath`（Prisma 扩展不再需要）                                                                                                     |
| 改   | `.gitignore`：去掉 `apps/studio/generated/`、`apps/studio/prisma/dev.db*`，加 drizzle 的本地库文件                                                                               |
| 改   | `apps/studio/docs/development.md` §8：改写为 Drizzle 工作流（schema 改动 → `drizzle-kit generate` → 启动时自动迁移）                                                             |
| 改   | `scripts/sync-seed.mjs`：输出目标改为 drizzle 自定义迁移目录                                                                                                                     |
| 保留 | `forge/hooks/natives.ts`、`electron-rebuild`（better-sqlite3 仍是原生模块）                                                                                                      |

## 6. 验证清单

1. **schema parity**（第 3.3 节脚本）→ 差异为空（除索引名/列顺序）
2. **迁移幂等**：空库跑一次 `migrate()` 建表 + 种子；再跑一次不重复执行
3. **兼容旧库**：用 Prisma 版迁移建好的库，跑 Drizzle 版启动流程 → 不报错、数据不动
4. **冒烟**：Auth 仓储 CRUD（现有 IPC 通道）单测通过
5. **打包烟测**：`electron-forge package` 后，asar 内 `drizzle/` 可读、迁移能执行
6. **与 Tauri 版互读**：用 Tauri 版建库 → Drizzle 版读写（以及反向）各一遍

## 7. 风险与需确认项

| 项                                | 处置                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `references()` 的 `onUpdate` 选项 | 生成后与 Rust DDL 对比；若 Drizzle 不支持完整 onUpdate 语义，用 `--custom` 迁移补 `ON UPDATE` 子句 |
| `__drizzle_migrations` hash 规则  | 实现时用一次真实迁移实测确认，不猜                                                                 |
| `text({ mode: 'json' })`          | 不使用（见 §1），避免历史脏值导致读失败                                                            |
| 索引名差异                        | 明确允许（`CREATE INDEX IF NOT EXISTS` 语义不受名字影响）                                          |
| 列顺序差异                        | 明确允许                                                                                           |

## 8. 实施顺序

1. 装依赖 + `drizzle.config.ts`
2. 写 `drizzle/schema.ts`（§2 的逐表映射）
3. `drizzle-kit generate` → parity 校验（§6.1）→ 修正 schema 直到差异为空
4. 迁移种子（§3.2）
5. 改造 `database.ts`，删除 `migrations.ts` / Prisma runner 与测试
6. 清理 Prisma 残留（依赖、配置、别名、打包、gitignore、docs、code-workspace）
7. 验证（§6 全量）+ 打包烟测

## 9. 执行状态

| 步骤                 | 状态    | 结果                                                                                                                     |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| ① 依赖 + 工具链      | ✅      | `drizzle-orm` / `drizzle-kit` / `@types/better-sqlite3` 已装；`postinstall` 只剩 `electron-rebuild`                      |
| ② schema 分领域文件  | ✅      | `drizzle/schema/{index,auth,mirror,asset,overlay,schedule,ai}.ts`：13 表 4 外键                                          |
| ③ init 迁移 + parity | ✅      | `drizzle/migrations/0000_init.sql`；parity exit 0（4 条已记录差异在 `ALLOWED`）                                          |
| ④ 种子迁移           | ✅      | `0001_seed.sql`（138 条 `INSERT OR IGNORE`），由 `scripts/sync-seed.mjs` 自 Tauri 迁移抽取                               |
| ⑤ 运行时改造         | ✅      | `database.ts`：better-sqlite3 + `migrate()`；采纳逻辑在 `database-migrate.ts`；自研 runner 已删                          |
| ⑥ 清理 Prisma        | ✅      | 删 `prisma/`、`generated/`、`prisma.config.ts`、`.env` 的 `DATABASE_URL`；依赖 / 别名 / asar keep / 文档全部改到 Drizzle |
| ⑦ 验证               | 🟡 部分 | 见下（可复跑的已全绿）                                                                                                   |

### 9.1 已验证（可复跑）

| 命令                                                        | 结果                                                                                                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `node scripts/check-schema-parity.mjs`                      | exit 0；参照已冻结为 `scripts/fixtures/legacy-v1.sql`，删掉 Prisma 目录后仍能长期对照                                                     |
| `pnpm --filter @i-thinking/studio test:db`                  | 3/3：真实 `better-sqlite3` + 官方 `migrate()`——空库建表+种子、启动幂等、旧库采纳（不重复建表、数据不动）                                  |
| `pnpm exec vitest run src/plugins/database-migrate.test.ts` | 4/4：用 `node:sqlite` 替身验采纳逻辑（hash / created_at 按实测格式登记）                                                                  |
| `pnpm exec vitest run`                                      | 14/15 文件通过；唯一失败 `src/components/contextmenu/position.test.ts`（`window is not defined`，DOM 环境缺失）为既有问题，与本次改动无关 |

集成测试为何单独一条命令：`better-sqlite3` 是按 Electron ABI 编译的原生模块，普通 Node 加载会 ABI 不匹配，故用 `ELECTRON_RUN_AS_NODE=1` 把 Electron 当 Node 跑（`scripts/run-db-tests.mjs`），并被排除在 `test:unit` 之外。

### 9.2 未做（需交互或环境）

- `electron-forge package` 烟测：确认 asar 内 `drizzle/` 可读（keep 列表已含 `/drizzle`）
- 与 Tauri 版**双向互读**（需两版切着跑）
- Auth 仓储的 IPC 冒烟（走现有通道，可用 `pnpm dev` 手测）

### 9.3 待确认（早前提过，未拍板）

- `Auth` 是 studio 自有示例仓储，表会建进**共享库**；是否保留该模型与 USER 通道
- Rust 迁移里无对应实体的三表 `user` / `notification` / `comment` 当前未建（Tauri 版启动时用 `IF NOT EXISTS` 自建）
- 可选增强：打开库时 `PRAGMA optimize`、`PRAGMA application_id` / `user_version`

### 9.4 后续变更：ai 域 → chat 域（替换完成后）

旧 ai 域（`aiWorkspace` / `aiWorkspaceFolder` / `aiSession` / `aiMessage` / `aiProvider`）studio 侧零引用，
按 task_plan D5 换成 chat 域（`chatProvider` / `chatSession` / `chatMessage`，见 `drizzle/schema/chat.ts`）。
三处随之调整（均已实测）：

| 项          | 变更                                                                                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| schema      | 删 `drizzle/schema/ai.ts`，新增 `chat.ts`；消息的 `format` + `content` 是主进程不解析的不透明载荷，`parentID` 表达分支                                                                 |
| 迁移        | `0002_chat_domain.sql`（建 chat 三表）+ `0003_drop_ai_domain.sql`（drop 旧 ai 五表）。拆两条是 drizzle-kit 的非交互限制：同一 diff 里"删旧表 + 建新表"会触发重命名询问，TTY 外无法回答 |
| 基线采纳    | `adoptBaseline()` 改为只采纳冻结的 v1 两条（`BASELINE_TAGS`）—— 否则既有库会把 0002/0003 也当成"已应用"，用户的旧库永远拿不到 chat 表、且残留 ai 表                                    |
| parity 脚本 | 表集合改为只单向核对（快照有、Drizzle 没有才算差异）；studio 自有/后加的表不再需要往 `ALLOWED` 里堆行；已记录 5 张 ai 表的 drop                                                        |
| 验证        | `pnpm --filter @i-thinking/studio test:db` 6/6（含 chat 级联/分支/provider set null 的新集成用例）                                                                                     |
