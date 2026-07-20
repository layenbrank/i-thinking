# Studio 打包指南

## 1. 构建工具

- **Electron Forge** + `@electron-forge/plugin-vite`
- 配置入口：[forge.config.ts](../forge.config.ts)（组装 [forge/](../forge/) 模块）
  - `forge/constants.ts` — appId / 名称 / 版本
  - `forge/packager.ts` — asar、ignore、afterCopy
  - `forge/makers.ts` — 全平台 makers
  - `forge/plugins.ts` — Vite / Fuses / AutoUnpackNatives
  - `forge/hooks/natives.ts` — better-sqlite3 复制
  - `forge/hooks/sidecar.ts` — 侧车复制 + SHA-256 校验
  - `sidecar/scripts/build.ts` / `sidecar/manifest.json` — 侧车构建与清单

构建产物目录：**仅** `apps/studio/out/`（勿使用 out-verify 等临时目录）。

| 进程 | 入口 | 输出 |
|------|------|------|
| Main | `src/main/main.ts` | `.vite/build/main.js`（CJS） |
| Preload | `src/preload/preload.ts` | `.vite/build/preload.js`（CJS，sandbox） |
| Renderer | `vite.renderer.config.ts` | Forge `main_window` |

`package.json`：`"type": "commonjs"`，`"main": ".vite/build/main.js"`。`appId`：`com.i-thinking.studio`。

## 2. 常用命令

```bash
# 开发
pnpm --filter @i-thinking/studio dev

# Rust 侧车 release → sidecar/staging/<platform-arch>/ + 更新 manifest
pnpm --filter @i-thinking/studio sidecar:build
pnpm --filter @i-thinking/studio sidecar:verify

# 可运行目录（需先 sidecar:build；输出到 out/）
pnpm --filter @i-thinking/studio package

# 当前 OS 安装包（输出到 out/make）
pnpm --filter @i-thinking/studio make
```

**Windows：** 打包前请关闭正在运行的 Studio，否则可能因 `app.asar` 被占用出现 `EBUSY`。

**约束：** 不能可靠交叉编译；全平台由 CI 在各 OS runner 上分别 `sidecar:build` + `make`。

## 3. Sidecar（企业级侧车）

源码：[`sidecar/`](../sidecar/)（Cargo workspace：`corex` / `generate` / `service`），release 启用 `lto` + `strip`。

| 平台 | 文件名 |
|------|--------|
| Windows | `corex.exe` / `generate.exe` / `service.exe` |
| macOS / Linux | `corex` / `generate` / `service` |

布局：

- 暂存：`sidecar/staging/<platform>-<arch>/`（如 `win32-x64`）
- 打包后：`resources/sidecar/<file>`
- 校验：[`sidecar/manifest.json`](../sidecar/manifest.json) 按平台存 SHA-256；`afterCopy` 失败则中断打包
- 运行时：Main `modules/sidecar` 白名单 + `studio.sidecar.findPath` / `exec`

## 4. 全平台 Makers

| 平台 | Maker | 用途 |
|------|-------|------|
| Windows | Squirrel | 安装程序 |
| Windows | ZIP | 便携包 |
| macOS | DMG | 安装镜像 |
| macOS | ZIP | 归档 |
| Linux | Deb | Debian/Ubuntu |
| Linux | Rpm | RHEL/Fedora |
| Linux | ZIP | 通用归档 |

## 5. asar / ignore

- **asar 仅保留** `.vite/`、`package.json`、`generated/`；`prune: false`
- `afterCopy`：better-sqlite3 + Sidecar

## 6. 原生与 Prisma

```bash
pnpm --filter @i-thinking/studio exec prisma generate
pnpm --filter @i-thinking/studio rebuild
```

## 7. Fuses

见 [security.md §7](./security.md#7-electron-fuses打包时)。

## 8. CI

[`.github/workflows/studio-desktop.yaml`](../../../.github/workflows/studio-desktop.yaml)：

1. Rust toolchain + `sidecar:build`
2. `make` → 上传 `apps/studio/out/**`

## 9. 产物注意

- 侧车进程独立于 Electron Main（非 Nest）
- Main 路径用 `paths.ts`
- 本轮未接代码签名 / 公证 / 自动更新
