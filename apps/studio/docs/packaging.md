# Studio 打包指南

## 1. 构建工具

- **Electron Forge** + `@electron-forge/plugin-vite`
- 入口（`forge.config.ts`）：
  - Main：`src/main/main.ts` → `.vite/build/main.js`
  - Preload：`src/preload/preload.ts` → `.vite/build/preload.js`
  - Renderer：`vite.renderer.config.ts`（`main_window`）

`package.json`：`"main": ".vite/build/main.js"`。

## 2. 常用命令

```bash
# 开发
pnpm --filter @i-thinking/studio dev

# 产出可运行目录（如 out/i-thinking-win32-x64）
pnpm --filter @i-thinking/studio package

# 安装包（make）
pnpm --filter @i-thinking/studio build
```

`build` **不再**依赖 `@i-thinking/service` 构建。

## 3. 额外资源

`packagerConfig.extraResource`：

- `src/bin` → 产物 `resources/bin/`（`corex.exe` / `generate.exe` / `service.exe` 等）

**不包含** `apps/service` 的 dist / node_modules。

`afterCopy`：复制实体 `better-sqlite3` 到应用 `node_modules`（兼容 pnpm 链接）。

## 4. 原生与 Prisma

打包前确保：

```bash
pnpm --filter @i-thinking/studio exec prisma generate
pnpm --filter @i-thinking/studio rebuild
```

`vite.main.config.ts` 将 `better-sqlite3` 设为 external；运行时从解压目录加载 `.node`。

## 5. Fuses

打包阶段由 `FusesPlugin` 写入，见 [security.md §7](./security.md#7-electron-fuses打包时)。

## 6. 产物注意

- 进程树中 **无** Nest / bun service 子进程
- `resources` 侧重点：`app.asar`、`bin/`、解压的 native 模块
- Main 路径解析使用 `paths.ts`（`argv[1]` / `APP_ROOT`），勿在业务里依赖 `import.meta.url`

## 7. Makers

配置含 Squirrel（Windows）、ZIP（darwin）、deb、rpm 等，按目标平台选择 `make` 环境。
