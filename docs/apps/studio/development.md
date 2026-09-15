# Studio 开发指南

## 1. 环境

- Node.js（与仓库约定一致）
- pnpm（workspace）
- Windows 上原生模块需能编译（`better-sqlite3` / `electron-rebuild`）
- Sidecar 解压用系统 `tar` / Expand-Archive（**无需** 7-Zip，也无额外解压 npm 包）

在 **monorepo 根**安装依赖：

```bash
pnpm install
```

`apps/studio` 的 `postinstall` 会执行：`electron-rebuild`（`better-sqlite3` 是原生模块）。

## 2. 常用脚本

在 `apps/studio` 或使用 filter：

| 脚本                                         | 作用                                             |
| -------------------------------------------- | ------------------------------------------------ |
| `pnpm --filter @i-thinking/studio dev`       | Electron Forge 开发（Main + Preload + Renderer） |
| `pnpm --filter @i-thinking/studio dev:core`  | 仅 Vite 网页模式（**无** `window.itc`）          |
| `pnpm --filter @i-thinking/studio test:unit` | Vitest（单测，不含集成测试）                     |
| `pnpm --filter @i-thinking/studio test:db`   | 数据库集成测试（在 Electron 运行时里跑，见 §8）  |
| `pnpm --filter @i-thinking/studio lint`      | ESLint                                           |
| `pnpm command sidecar bootstrap studio`      | tools.lock → downloads → studio staging          |
| `pnpm command sidecar corex`                 | 仅下载 corex 到 `.cache/sidecar`                 |
| `pnpm command sidecar ffmpeg`                | 仅下载 FFmpeg（包较大，受网络影响）              |
| `pnpm command sidecar pandoc`                | 仅下载 pandoc                                    |
| `pnpm command sidecar stage studio`          | stage → studio staging                           |
| `pnpm command sidecar verify studio`         | 校验 staging checksums                           |
| `pnpm --filter @i-thinking/studio package`   | 打出可运行目录到 `out/`（需先 bootstrap）        |
| `pnpm --filter @i-thinking/studio build`     | 同 `package`（供 turbo / PR CI）                 |
| `pnpm --filter @i-thinking/studio make`      | `electron-forge make` → `out/make`               |

## 3. 环境变量

由 Vite / 类型声明使用（见 `src/types/env.d.ts`）：

| 变量                                            | 用途                                            |
| ----------------------------------------------- | ----------------------------------------------- |
| `VITE_THINKING`                                 | Renderer HTTP `prefix`（远程 Thinking API）     |
| `VITE_APP_TITLE`                                | `index.html` 标题占位                           |
| `VITE_HOSTNAME` / `VITE_PORT` / `VITE_PROTOCOL` | 遗留本地服务相关（当前已不启 Nest；可按需清理） |

Main 运行时由 bootstrap 设置：

- `APP_ROOT` ← `app.getAppPath()`
- `VITE_PUBLIC` ← `join(APP_ROOT, 'public')`

Forge 注入（窗口加载）：

- `MAIN_WINDOW_VITE_DEV_SERVER_URL`
- `MAIN_WINDOW_VITE_NAME`

打包 / 签名 / 发布 / 自动更新环境变量见 [packaging.md](./packaging.md)。

## 4. 目录与别名

```text
src/main.ts | src/preload.ts | src/renderer.tsx | src/plugins/ | sidecar/
```

- `@/*` → `src/*`（UI）
- 宿主：相对路径 `./plugins/…`（无 `@main` / `@shared`）

进程边界由 ESLint `no-restricted-imports` 约束（见 `eslint.config.ts`）。

## 5. 本地调试

- `dev` 启动后，DevTools **仅开发态**可通过 `itc.devtools.toUpdate({ visible: true })` 打开（生产打包默认关闭）。
- 主进程日志：结构化 `buildLogger(module)`；未捕获异常接入 bootstrap。
- IPC 失败：preload 抛出 `Error('[CODE] message')`，见 [api-reference.md](./api-reference.md)。

## 6. 扩展功能

1. 读 [modules.md](./modules.md) 了解模块挂载方式
2. 照 [examples.md](./examples.md)「新增 IPC 全链路」改 channels → plugin 单文件 → main.ts → preload
3. 更新 [api-reference.md](./api-reference.md) 中的表格（文档与代码同步）

## 7. 测试

- 配置：`vitest.config.ts`
- 约定：`src/**/*.test.ts`
- 现有覆盖示例：
  - `plugins/store.test.ts`
  - `plugins/user.test.ts`
  - `plugins/doc.test.ts`
  - `plugins/contract.test.ts`
  - `plugins/sidecar.paths.test.ts`
  - `plugins/trusted-sender.test.ts`
  - `preload.expose.test.ts`（断言不暴露 `ipcRenderer`）

```bash
pnpm --filter @i-thinking/studio test:unit
```

## 8. 数据库 / 原生模块

```bash
# 在 apps/studio
pnpm exec drizzle-kit generate --name=<name>   # 改 drizzle/schema 后生成迁移
pnpm rebuild   # electron-rebuild（better-sqlite3 是原生模块）
pnpm test:db   # 真实引擎的数据库集成测试（迁移幂等 / 兼容另一版建好的库）
```

- 集成测试 `src/plugins/database.integration.test.ts` 需要 **Electron ABI** 的 `better-sqlite3`，普通 Node 加载会 ABI 不匹配，所以它被排除在 `test:unit` 之外；`test:db` 用 `ELECTRON_RUN_AS_NODE=1` 把 Electron 当 Node 跑 vitest（`scripts/run-db-tests.mjs`）。

- schema 按领域分文件放在 `drizzle/schema/`（`index.ts` 汇总），迁移产物在 `drizzle/migrations/`（SQL + `meta/journal`）。
- 访问层用 **Drizzle ORM**，引擎 **better-sqlite3**；新增表应通过 **Repository + 领域 IPC** 暴露，禁止 raw SQL channel。
- **两版同实现**（Electron / Tauri，用户只装其一）：库路径与 schema 保持一致（`app_local_data_dir()/i-thinking.db`，identifier `com.i-thinking.corex`），**建表由各自完成** —— studio 启动时跑 Drizzle 官方 `migrate()`；若库里已有另一版建好的结构，则先"采纳基线"（`src/plugins/database-migrate.ts`）。
- 种子数据：`node scripts/sync-seed.mjs` 从 Tauri 版迁移抽取，写入 `drizzle/migrations/<idx>_seed.sql`（先 `drizzle-kit generate --custom --name=seed` 建空壳；勿手改生成物）。
- schema 一致性校验：`node scripts/check-schema-parity.mjs`（对比 v1 参照快照 `scripts/fixtures/legacy-v1.sql` 与 Drizzle 迁移建出的库，允许差异见脚本内 `ALLOWED`）。
- 迁移背景与逐表映射见 [prisma-to-drizzle.md](./prisma-to-drizzle.md)。

## 9. 下一步

- 架构总览 → [architecture.md](./architecture.md)
- 复制调用 → [examples.md](./examples.md)
- 打包发版 → [packaging.md](./packaging.md)
- 出问题 → [troubleshooting.md](./troubleshooting.md)
