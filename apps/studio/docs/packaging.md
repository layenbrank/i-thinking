# Studio 打包指南

## 1. 构建工具

- **Electron Forge** + `@electron-forge/plugin-vite`（**不**使用 electron-builder）
- 配置入口：[forge.config.ts](../forge.config.ts)（组装 [forge/](../forge/) 模块）
  - `forge/constants.ts` — appId / 名称 / 版本
  - `forge/env.ts` — 签名 / 可选 makers / 发布 / 更新相关环境变量
  - `forge/packager.ts` — asar、ignore、afterCopy、Windows/macOS 签名
  - `forge/makers.ts` — 默认 + 可选 makers
  - `forge/publishers.ts` — GitHub Releases / S3（默认关闭）
  - `forge/plugins.ts` — Vite / Fuses / AutoUnpackNatives
  - `forge/hooks/natives.ts` — better-sqlite3 复制
  - `forge/hooks/external-deps.ts` — electron-updater 及传递依赖复制
  - `forge/hooks/sidecar.ts` — 侧车复制 + SHA-256 校验

构建产物目录：**仅** `out/studio/`（仓库根目录下）。

| 进程 | 入口 | 输出 |
|------|------|------|
| Main | `src/main.ts` | `.vite/build/main.js`（CJS） |
| Preload | `src/preload.ts` | `.vite/build/preload.js`（CJS，sandbox） |
| Renderer | `src/renderer.tsx`（`index.html`） | Forge `main_window` |

`appId`：`com.i-thinking.studio`。

## 2. 常用命令

```bash
pnpm --filter @i-thinking/studio dev
pnpm command sidecar bootstrap studio
pnpm --filter @i-thinking/studio package
pnpm --filter @i-thinking/studio make
# 发版（需开启 publishers 环境变量）
pnpm --filter @i-thinking/studio publish
```

**Windows：** 打包配置 `tmpdir: false`，直接在 `out/studio/` 构建，不经过临时目录中转。`@electron/packager` 已通过 pnpm patch 将内部 `fs.rename` / `fs.move` 替换为 `fs.copy` + `fs.remove`，避免独占文件句柄，兼容火绒等第三方杀软。打包前会自动：

1. 结束本仓库路径下的 `electron` / `i-thinking` 进程
2. 清理 `out/studio`

若使用第三方杀毒（火绒 / 360 等），建议将 `out/studio` 加入排除列表以减少文件锁定。

## 3. 全平台 Makers

| 平台 | Maker | 默认 | 说明 |
|------|-------|------|------|
| Windows | Squirrel | ✅ | 安装程序 + 可选 `remoteReleases` 增量 |
| Windows | ZIP | ✅ | 便携包 |
| Windows | MSIX | `STUDIO_MAKE_MSIX=1` | 需 Windows SDK |
| Windows | WiX MSI | `STUDIO_MAKE_WIX=1` | 需 WiX Toolset |
| macOS | DMG | ✅ | 安装镜像 |
| macOS | ZIP | ✅ | 归档 / Sparkle 兼容 feed |
| macOS | PKG | ✅（`STUDIO_MAKE_PKG_OFF=1` 关闭） | 企业安装包 |
| Linux | Deb / Rpm / ZIP | ✅ | 常见发行版 |
| Linux | Flatpak | `STUDIO_MAKE_FLATPAK=1` | 需 flatpak-builder |

## 4. 代码签名 / 公证

通过环境变量启用（未设置则跳过，本地开发不受影响）：

| 变量 | 用途 |
|------|------|
| `WINDOWS_CERTIFICATE_FILE` + `WINDOWS_CERTIFICATE_PASSWORD` | Authenticode（PFX） |
| `WINDOWS_CERTIFICATE_SUBJECT` | 证书存储按主题名（`signtool /n`） |
| `STUDIO_OSX_SIGN=1` 或 `APPLE_IDENTITY` | macOS `osxSign` |
| `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID` | Notarize |

## 5. 发布（Publishers）

| 变量 | 用途 |
|------|------|
| `STUDIO_PUBLISH_GITHUB=1` + `GITHUB_TOKEN` | GitHub Releases（默认 draft） |
| `STUDIO_GITHUB_OWNER` / `STUDIO_GITHUB_REPO` | 仓库（默认 `i-thinking/i-thinking`） |
| `STUDIO_PUBLISH_S3=1` + `STUDIO_S3_BUCKET` | S3 发布 |
| `STUDIO_S3_REGION` / `STUDIO_S3_FOLDER` / `STUDIO_S3_PUBLIC` | S3 可选 |
| `STUDIO_S3_UPDATE_BASE` | Squirrel / mac ZIP 增量 feed 前缀 |

## 6. 自动更新（electron-updater）

主进程模块 `modules/updater`，Renderer：`itc.updater.*`。

| 变量 | 用途 |
|------|------|
| `STUDIO_UPDATE_PROVIDER=github\|generic` | 更新源 |
| `STUDIO_UPDATE_URL` | generic feed URL |
| `STUDIO_GITHUB_OWNER` / `STUDIO_GITHUB_REPO` | github provider |

开发态（未 packaged）自动禁用；未配置时 `findStatus().enabled === false`。

## 7. asar / Sidecar / Fuses / CI

- asar 保留 `.vite` / `package.json` / `generated` / `node_modules`（排除 `@i-thinking/*` workspace 符号链接，Vite 已打包）；external 模块（electron-updater + 传递依赖）由 `forge/hooks/external-deps.ts` afterCopy 复制进 asar，Fuses OnlyLoadAppFromAsar 禁止从 asar 外加载；侧车由 `forge/hooks/sidecar.ts` afterCopy 写入 `resources/sidecar`
- 二进制**不进 Git**：`staging/`、`.cache/sidecar/`、exe/dll 均 gitignore
- 版本真相：`scripts/commands/features/sidecar/tools.lock.json`；本地完整性：`staging/<platform>/checksums.json`
- **corex** 来自 [layenbrank/corex releases](https://github.com/layenbrank/corex/releases)（`corex-daemon` + CLI），非仓库内自研 stub
- 开发：`pnpm command sidecar bootstrap studio`
- Fuses 见 [security.md](./security.md)；CI：[`.github/workflows/studio-desktop.yaml`](../../../.github/workflows/studio-desktop.yaml)
