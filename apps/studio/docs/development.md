# Studio 开发指南

## 1. 环境

- Node.js（与仓库约定一致）
- pnpm（workspace）
- Windows 上原生模块需能编译（`better-sqlite3` / `electron-rebuild`）

在 **monorepo 根**安装依赖：

```bash
pnpm install
```

`apps/studio` 的 `postinstall` 会执行：`prisma generate` + `electron-rebuild`。

## 2. 常用脚本

在 `apps/studio` 或使用 filter：

| 脚本 | 作用 |
|------|------|
| `pnpm --filter @i-thinking/studio dev` | Electron Forge 开发（Main + Preload + Renderer） |
| `pnpm --filter @i-thinking/studio dev:core` | 仅 Vite 网页模式（**无** `window.studio`） |
| `pnpm --filter @i-thinking/studio test:unit` | Vitest |
| `pnpm --filter @i-thinking/studio lint` | ESLint |
| `pnpm --filter @i-thinking/studio sidecar:build` | Rust 侧车 release → `sidecar/staging/<platform-arch>/` |
| `pnpm --filter @i-thinking/studio package` | 打出可运行目录到 `out/`（需先 sidecar:build） |
| `pnpm --filter @i-thinking/studio build` | 同 `package`（供 turbo / PR CI） |
| `pnpm --filter @i-thinking/studio make` | `electron-forge make` → `out/make` |

## 3. 环境变量

由 Vite / 类型声明使用（见 `src/renderer/types/env.d.ts`）：

| 变量 | 用途 |
|------|------|
| `VITE_THINKING` | Renderer HTTP `prefix`（远程 Thinking API） |
| `VITE_APP_TITLE` | `index.html` 标题占位 |
| `VITE_HOSTNAME` / `VITE_PORT` / `VITE_PROTOCOL` | 遗留本地服务相关（当前已不启 Nest；可按需清理） |

Main 运行时由 bootstrap 设置：

- `APP_ROOT` ← `app.getAppPath()`
- `VITE_PUBLIC` ← `join(APP_ROOT, 'public')`

Forge 注入（窗口加载）：

- `MAIN_WINDOW_VITE_DEV_SERVER_URL`
- `MAIN_WINDOW_VITE_NAME`

## 4. 目录与别名

```text
src/main | src/preload | src/renderer | src/shared | sidecar/
```

- `@/*` → `src/renderer/*`
- `@main/*` / `@shared/*` / `@preload/*` 分进程

进程边界由 ESLint `no-restricted-imports` 约束（见 `eslint.config.ts`）。

## 5. 本地调试

- `dev` 启动后，DevTools **仅开发态**可通过 `studio.devtools.updateVisible({ visible: true })` 打开（生产打包默认关闭）。
- 主进程日志：结构化 `buildLogger(module)`；未捕获异常接入 bootstrap。
- IPC 失败：preload 抛出 `Error('[CODE] message')`，见 [api-reference.md](./api-reference.md)。

## 6. 扩展功能

1. 读 [modules.md](./modules.md) 了解模块挂载方式  
2. 照 [examples.md](./examples.md)「新增 IPC 全链路」改 channels → schema → module → bootstrap → preload  
3. 更新 [api-reference.md](./api-reference.md) 中的表格（文档与代码同步）

## 7. 测试

- 配置：`vitest.config.ts`
- 约定：`src/**/*.test.ts`
- 现有覆盖示例：
  - `shared/ipc/schemas.test.ts`
  - `main/modules/sidecar/allowlist.test.ts`
  - `main/ipc/trusted-sender.test.ts`
  - `main/paths.test.ts`
  - `preload/expose.test.ts`（断言不暴露 `ipcRenderer`）

```bash
pnpm --filter @i-thinking/studio test:unit
```

## 8. Prisma / 原生模块

```bash
# 在 apps/studio
pnpm exec prisma generate
pnpm rebuild   # electron-rebuild
```

改 `prisma/schema.prisma` 后需重新 generate；新增表应通过 **Repository + 领域 IPC** 暴露，禁止 raw SQL channel。

## 9. 下一步

- 架构总览 → [architecture.md](./architecture.md)
- 复制调用 → [examples.md](./examples.md)
- 打包发版 → [packaging.md](./packaging.md)
- 出问题 → [troubleshooting.md](./troubleshooting.md)
