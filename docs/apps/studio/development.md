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
| `pnpm command sidecar opencode`              | 仅下载 opencode（按 tools.lock 的 pin 校验版本） |
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

| 变量                                            | 用途                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `VITE_THINKING`                                 | Renderer HTTP `prefix`（远程 Thinking API；平台模型走其下的 `/gateway` 网关） |
| `VITE_APP_TITLE`                                | `index.html` 标题占位                                                         |
| `VITE_HOSTNAME` / `VITE_PORT` / `VITE_PROTOCOL` | 遗留本地服务相关（当前已不启 Nest；可按需清理）                               |

> **业务后端不在这个仓库**：`apps/service`（NestJS）已下线 —— 登录 / 注册 / 租户 / 配额 / 订阅与
> AI 网关（`/gateway/*`）都在独立的 Rust 仓库里维护，本地这样起：
> `cargo watch -x "run --bin service --features openapi"`，再把 `VITE_THINKING` 指到它的 `/api/v1`
> （如 `http://127.0.0.1:3000/api/v1`）。studio 只依赖这套 HTTP 契约，不 vendor 后端代码；
> agent 的运行则在 studio 自己的内嵌 opencode 里，与服务端无关。

Main 运行时由 bootstrap 设置：

- `APP_ROOT` ← `app.getAppPath()`
- `VITE_PUBLIC` ← `join(APP_ROOT, 'public')`

Forge 注入（窗口加载）：

- `MAIN_WINDOW_VITE_DEV_SERVER_URL`
- `MAIN_WINDOW_VITE_NAME`

打包 / 签名 / 发布 / 自动更新环境变量见 [packaging.md](./packaging.md)。

## 4. 目录与别名

```text
src/main.ts | src/preload.ts | src/renderer.tsx | src/host/capabilities/ | sidecar/
```

- `@/*` → `src/*`（UI）
- 宿主：相对路径 `./host/…`（无 `@main` / `@shared`）

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
- 约定：`src/**/*.test.ts`；渲染测试写 `*.test.tsx`，并在文件首行加 `// @vitest-environment jsdom` 切到 DOM 环境（默认环境是 `node`，没有 `document`）
- 现有覆盖示例：
  - `host/capabilities/store.test.ts`
  - `host/capabilities/user.test.ts`
  - `host/capabilities/doc.test.ts`
  - `shared/ipc/contract.test.ts`
  - `host/ipc/register.test.ts`（假 IpcMain，无需启动 Electron）
  - `host/capabilities/sidecar.paths.test.ts`
  - `host/capabilities/trusted-sender.test.ts`
  - `preload.expose.test.ts`（断言不暴露 `ipcRenderer`）
  - `components/contextmenu/contextmenu.test.tsx`、`views/agent/chat/components/{diff-view,tool-terminal}.test.tsx`（组件渲染，走 `@testing-library/react`）

```bash
pnpm --filter @i-thinking/studio test:unit
```

## 8. 数据库 / 原生模块

```bash
# 在 apps/studio
pnpm exec drizzle-kit generate --name=<name>   # 改 drizzle/schema 后生成迁移
pnpm run rebuild   # = electron-rebuild -f：按 Electron ABI 重建 better-sqlite3 / msgpackr-extract
pnpm test:db       # 真实引擎的数据库集成测试（建表 / 种子 / 迁移幂等）
```

- 必须显式写 `pnpm run rebuild`（等价 `pnpm --filter @i-thinking/studio run rebuild`）：裸 `pnpm rebuild` 是 pnpm 的**内置命令**，不会执行这个 script，而是对全仓包重跑 install 脚本（为**宿主 Node** 构建原生模块，会把 Electron ABI 的 `better-sqlite3` 覆盖成宿主 ABI → `NODE_MODULE_VERSION` 不匹配）。为此 [pnpm-workspace.yaml](../../../pnpm-workspace.yaml) 里 `allowBuilds.better-sqlite3: false` 关掉了 better-sqlite3 自己的 install 脚本，构建统一交给 `@electron/rebuild`。
- 该 script 带 `-f`：`@electron/rebuild` 只读 `build/Release/.forge-meta`（内容 `<arch>--<ABI>`）判断「是否已构建」，**不校验二进制是否存在或正确**；marker 与当前 Electron 一致时会打印 `✔ Rebuild Complete` 却什么都不做，所以修 ABI 问题必须强制重建。

- 集成测试 `src/host/capabilities/*.integration.test.ts` 需要 **Electron ABI** 的 `better-sqlite3`，普通 Node 加载会 ABI 不匹配，所以它们被排除在 `test:unit` 之外；`test:db` 用 `ELECTRON_RUN_AS_NODE=1` 把 Electron 当 Node 跑 vitest（`scripts/run-db-tests.mjs`）。

- schema 按领域分文件放在 `drizzle/schema/`（`index.ts` 汇总），迁移产物在 `drizzle/migrations/`（SQL + `meta/journal`）。
- 访问层用 **Drizzle ORM**，引擎 **better-sqlite3**；新增表应通过 **Repository + 领域 IPC** 暴露，禁止 raw SQL channel。
- **迁移只有一个文件**：`drizzle/migrations/0000_init.sql`（全量建表 + 138 条种子 `INSERT OR IGNORE`）。开发阶段不保留历史版本 —— 改 schema 后直接重新生成，把种子并回去，并删掉本地库让它重建。
- 工作区现为 `workspace` + `workspaceFolder`（会话挂 `workspaceID`）。本地若仍是旧 `workspaceRoot` 结构，**删库重建**即可。
- **studio 自己建表**：启动时跑 Drizzle 官方 `migrate()`（`src/host/capabilities/database.ts`）。库里已有同名表会让 migrator 直接报错 —— **不支持「库是别的版本建的」**这种情况，冲突当场暴露比猜别人的 schema 好。
- 两个 app 的库路径仍指向同一文件（`app_local_data_dir()/i-thinking.db`，identifier `com.i-thinking.corex`），以便日后互读；但建表/迁移互不负责。
- 改 schema 的流程：改 `drizzle/schema/*.ts` → `pnpm --filter @i-thinking/studio exec drizzle-kit generate --name <名字>`；确认没多余产物后重启 app。
- 迁移背景与逐表映射见 [prisma-to-drizzle.md](../../decisions/prisma-to-drizzle.md)。

## 9. 下一步

- 架构总览 → [architecture.md](./architecture.md)
- 复制调用 → [examples.md](./examples.md)
- 打包发版 → [packaging.md](./packaging.md)
- 出问题 → [troubleshooting.md](./troubleshooting.md)
