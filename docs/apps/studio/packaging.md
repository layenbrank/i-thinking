# Studio 打包指南

## 1. 构建工具

- **Electron Forge** + `@electron-forge/plugin-vite`（**不**使用 electron-builder）
- 配置入口：[forge.config.ts](../../../apps/studio/forge.config.ts)（组装 [forge/](../../../apps/studio/forge/) 模块）
  - `forge/constants.ts` — appId / 名称 / 版本
  - `forge/env.ts` — 签名 / 可选 makers / 发布 / 更新相关环境变量
  - `forge/packager.ts` — asar、ignore、afterCopy、Windows/macOS 签名
  - `forge/makers.ts` — 默认 + 可选 makers
  - `forge/publishers.ts` — GitHub Releases / S3（默认关闭）
  - `forge/plugins.ts` — Vite / Fuses / AutoUnpackNatives
  - `forge/hooks/external-deps.ts` — Vite external（better-sqlite3）及依赖闭包复制
  - `forge/hooks/sidecar.ts` — 侧车复制 + SHA-256 校验

构建产物目录：**仅** `out/studio/`（仓库根目录下）。

| 进程     | 入口                               | 输出                                     |
| -------- | ---------------------------------- | ---------------------------------------- |
| Main     | `src/main.ts`                      | `.vite/build/main.js`（CJS）             |
| Preload  | `src/preload.ts`                   | `.vite/build/preload.js`（CJS，sandbox） |
| Renderer | `src/renderer.tsx`（`index.html`） | Forge `main_window`                      |

`appId`：`com.i-thinking.studio`。

## 2. 常用命令

```bash
pnpm --filter @i-thinking/studio dev
pnpm command sidecar bootstrap studio            # 全量落盘（档位不在这里决定）
pnpm --filter @i-thinking/studio package
pnpm --filter @i-thinking/studio package:full
pnpm --filter @i-thinking/studio make
pnpm --filter @i-thinking/studio make:full
# 发版（需开启 publishers 环境变量）
pnpm --filter @i-thinking/studio publish
```

**两档产物：** `package` / `make` / `publish` 默认 **精简版（lite）** —— pandoc / ffmpeg / opencode
不进安装包，由 Studio 运行时在线下载（见 [development.md](./development.md#两档产物精简版--完整版)）；
`*:full` 内置全部侧车。**档位只有这一个决策点**（`apps/studio/scripts/run-forge.mjs` 把它作为
`STUDIO_SIDECAR_VARIANT` 传入 `forge/env.ts`，过滤发生在 `forge/hooks/sidecar.ts`，依据是 staging 的
`checksums.json.onDemand`）；落盘那一步一律全量，所以切档不用重跑 bootstrap。

**Windows：** 打包配置 `tmpdir: false`，直接在 `out/studio/` 构建，不经过临时目录中转。`@electron/packager` 已通过 pnpm patch 将内部 `fs.rename` / `fs.move` 替换为 `fs.copy` + `fs.remove`，避免独占文件句柄，兼容火绒等第三方杀软。打包前会自动：

1. 结束本仓库路径下的 `electron` / `i-thinking` 进程
2. 清理 `out/studio`

若使用第三方杀毒（火绒 / 360 等），建议将 `out/studio` 加入排除列表以减少文件锁定。

## 3. 全平台 Makers

| 平台    | Maker           | 默认                               | 说明                                  |
| ------- | --------------- | ---------------------------------- | ------------------------------------- |
| Windows | Squirrel        | ✅                                 | 安装程序 + 可选 `remoteReleases` 增量 |
| Windows | ZIP             | ✅                                 | 便携包                                |
| Windows | MSIX            | `STUDIO_MAKE_MSIX=1`               | 需 Windows SDK                        |
| Windows | WiX MSI         | `STUDIO_MAKE_WIX=1`                | 需 WiX Toolset                        |
| macOS   | DMG             | ✅                                 | 安装镜像                              |
| macOS   | ZIP             | ✅                                 | 归档 / Sparkle 兼容 feed              |
| macOS   | PKG             | ✅（`STUDIO_MAKE_PKG_OFF=1` 关闭） | 企业安装包                            |
| Linux   | Deb / Rpm / ZIP | ✅                                 | 常见发行版                            |
| Linux   | Flatpak         | `STUDIO_MAKE_FLATPAK=1`            | 需 flatpak-builder                    |

## 4. 代码签名 / 公证

通过环境变量启用（未设置则跳过，本地开发不受影响）：

| 变量                                                         | 用途                              |
| ------------------------------------------------------------ | --------------------------------- |
| `WINDOWS_CERTIFICATE_FILE` + `WINDOWS_CERTIFICATE_PASSWORD`  | Authenticode（PFX）               |
| `WINDOWS_CERTIFICATE_SUBJECT`                                | 证书存储按主题名（`signtool /n`） |
| `STUDIO_OSX_SIGN=1` 或 `APPLE_IDENTITY`                      | macOS `osxSign`                   |
| `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID` | Notarize                          |

## 5. 发布（Publishers）

| 变量                                                         | 用途                                          |
| ------------------------------------------------------------ | --------------------------------------------- |
| `STUDIO_PUBLISH_GITHUB=1` + `GITHUB_TOKEN`                   | GitHub Releases（默认 draft）                 |
| `STUDIO_GITHUB_OWNER` / `STUDIO_GITHUB_REPO`                 | 仓库（默认 `layenbrank/i-thinking`）          |
| `STUDIO_PUBLISH_S3=1` + `STUDIO_S3_BUCKET`                   | S3 发布（**自动更新 feed 走这里**）           |
| `STUDIO_S3_REGION` / `STUDIO_S3_FOLDER` / `STUDIO_S3_PUBLIC` | S3 可选                                       |
| `STUDIO_S3_UPDATE_BASE`                                      | 客户端 feed 与 Squirrel `remoteReleases` 前缀 |

`studio-v*` tag 会把 `Setup.exe` / `.nupkg` / `RELEASES` 传到 CI artifact，并打一份 **draft GitHub Release 给人下载**。那份 Release **不是** Squirrel feed：`autoUpdater.setFeedURL` 要的是 HTTP 目录里并排的 `RELEASES` + `.nupkg`（配 `STUDIO_S3_UPDATE_BASE` / `STUDIO_UPDATE_URL`，或日后签名后的 update.electronjs.org）。Maker 的 `remoteReleases` 只用于打增量包时拉旧 `RELEASES`，不能代替客户端 `setFeedURL`。

避开 Tauri Client 的 `v*` tag，Studio 只用 **`studio-v*`**。发版只 bump `apps/studio/package.json` 的 `version`。

## 6. 自动更新（`electron.autoUpdater`）

内置 Squirrel：`checkForUpdates()` **发现更新即下载**，没有百分比进度，也没有「只检查不下载」。Renderer：`itc.updater.check` / `download`（download 是 check 的别名）/ `install`。

| 变量                    | 用途                                      |
| ----------------------- | ----------------------------------------- |
| `STUDIO_UPDATE_URL`     | feed 目录 URL（含 `RELEASES`）            |
| `STUDIO_S3_UPDATE_BASE` | 未设 URL 时拼 `{base}/win32/x64`          |

`make` 时 Vite 把 feed 编译进 `STUDIO_UPDATE_FEED_URL`。开发态 / 未 packaged / 未配置 → `toRead().enabled === false`。`--squirrel-firstrun` 时不检查。

Windows AUMID：`com.squirrel.i-thinking.i-thinking`（与 Maker `name` / exe 一致）。

不要用 electron-updater 的 `latest.yml` / `provider: github`，也不要 `update-electron-app` 系统弹窗。

## 7. asar / Sidecar / Fuses / CI / 图标

- asar 保留 `.vite` / `package.json` / `drizzle` / `node_modules`（排除 `@i-thinking/*`）；Vite external 仅 **better-sqlite3** 闭包由 `forge/hooks/external-deps.ts` 复制（排除 src/docs/test/.map）；**禁止 asar 热更**（Fuses `EnableEmbeddedAsarIntegrityValidation` + `OnlyLoadAppFromAsar`）。打包态页面走 `file://`，不要关 `GrantFileProtocolExtraPrivileges`。
- 图标：品牌源 `apps/studio/resources/icon.svg` → `pnpm --filter @i-thinking/studio icons` 生成 1024 PNG 与 256 ICO（icns 仅 macOS `iconutil`）；`extraResource` 只收录存在的文件。开发态从 `public/` 或 `resources/` 取。
- 二进制**不进 Git**：`staging/`、`.cache/sidecar/`、exe/dll 均 gitignore
- 版本真相：`scripts/commands/features/sidecar/tools.lock.json`；corex sidecar **目前仅 win32-x64**，CI 不扩 mac/linux
- **corex 始终随包**（lock 里**不标** `onDemand`，精简版/完整版都带）：它是自研 sidecar，直链走自建 R2 镜像（corex 自己发布在 [layenbrank/corex](https://github.com/layenbrank/corex)，仓库侧只钉版本与 sha256）；同一个归档里取 `corex-daemon`、`corex` 与 `corex-mcp`（后者供 opencode 等按名字拉起）
- 开发：`pnpm command sidecar bootstrap studio`
- 冒烟：`pnpm --filter @i-thinking/studio test:pack` 启动 `out/studio/i-thinking-win32-x64/i-thinking.exe`（**不要**跑 Setup.exe）
- Fuses 见 [security.md](./security.md)；CI：[`.github/workflows/studio-desktop.yaml`](../../../.github/workflows/studio-desktop.yaml)
