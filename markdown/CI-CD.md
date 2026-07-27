# Monorepo CI/CD 指南 (pnpm + Turborepo + GitHub Actions)

本文档说明当前仓库的 CI/CD 设计与使用方法，覆盖：质量检查、按子项目独立发布、文档部署。

## 目标

- PR 自动质量门禁：安装、lint、类型检查、测试、构建（client 仅 Vite `build:core`），上传产物以便预览排查。
- 按子项目发布：`v*` tag 分别触发 client（Tauri Windows + GitHub Release）与 service（GHCR 镜像）。
- Docs 自动部署：推送到 master 且变更 `apps/docs/**` 时发布 VitePress 到 GitHub Pages。

## 目录结构要点

- `apps/service`：NestJS 服务（端口 9000，产物在 `dist/`）
- `apps/client`：Tauri 2 桌面 + React（安装包由 `client-release` 产出；Web 产物在 `dist/`）
- `apps/studio`：Electron 桌面（`studio-desktop` 多平台 make）
- `apps/extension`、`apps/devtools`：Vite 前端
- `apps/docs`：VitePress
- `packages/*`：共享包（产物在 `dist/`）

## 工作流

### 1) CI（PR / Develop）

文件：`.github/workflows/continuous-integration.yaml`

- 触发：PR 到 `master`/`develop`，或 push 到 `develop`
- 环境：Node 24 + pnpm（读取根 `package.json` 的 `packageManager`）
- Actions 运行时：使用已支持 Node 24 的版本（如 `pnpm/action-setup@v6`、`actions/setup-node@v6`、`checkout@v6`、`cache@v5`）。**不要**设置 `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION`——那是临时继续用已弃用 Node 20 的退路，不是推荐做法
- 步骤：
  - `pnpm install --frozen-lockfile`
  - `pnpm lint`
  - 类型检查（extension / client）
  - 单元测试（service）
  - `pnpm turbo run build --filter=!@i-thinking/client`
  - `pnpm --filter @i-thinking/client run build:core`（仅 Web，避免 Ubuntu 上跑 Tauri）
  - 上传 `apps/**/dist/**`、`packages/**/dist/**` 等为制品

### 2) Client Release（Tauri Windows）

文件：`.github/workflows/client-release.yaml`

- 触发：push tag `v*`，或 `workflow_dispatch`
- Runner：`windows-latest`
- 步骤概要：
  - 校验已入库 sidecar：`apps/client/src-tauri/binaries/corex-serve-*.exe` + `pdfium.dll`
  - `pnpm --filter @i-thinking/client build`（`tauri build`）
  - 收集 NSIS/MSI、`.sig`、`latest.json` 到 `release-artifacts/`
  - `softprops/action-gh-release@v3` 发布到 GitHub Releases
- Updater 端点（见 `tauri.conf.json`）：
  `https://github.com/<owner>/<repo>/releases/latest/download/latest.json`

**必需 Secrets：**

| Secret | 说明 |
|--------|------|
| `TAURI_SIGNING_PRIVATE_KEY` | Tauri updater 签名私钥（`createUpdaterArtifacts: true`） |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 私钥密码；无密码也需存在并为空字符串（勿省略，否则会交互卡死） |

### 3) Service Release（GHCR）

文件：`.github/workflows/service-release.yaml`

- 触发：push tag `v*`，或 `workflow_dispatch`
- 使用 `apps/service/Dockerfile` 多架构构建并推送：`linux/amd64,linux/arm64`
- 权限：`packages: write`（`GITHUB_TOKEN` 登录 GHCR）
- 镜像：`ghcr.io/<owner>/<repo>-service:<tag>`

### 4) Studio Desktop

文件：`.github/workflows/studio-desktop.yaml`

- 触发：`workflow_dispatch`，或 push `master`/`develop` 且变更 `apps/studio/**`
- Matrix：Windows / macOS / Ubuntu，产出 Electron 安装包 artifact

### 5) Pages（Docs）

文件：`.github/workflows/pages.yaml`

- 触发：`master` 分支变更 `apps/docs/**` 或该 workflow 文件
- 构建 `apps/docs` 并发布到 GitHub Pages

## Docker

### 服务镜像（NestJS）

文件：`apps/service/Dockerfile`

```bash
docker build -t my-service -f apps/service/Dockerfile .
docker run -p 9000:9000 my-service
```

### 通用前端镜像（Nginx）

文件：`docker/Dockerfile`

```bash
docker build -t web-ext -f docker/Dockerfile --build-arg APP_DIR=apps/extension .
docker run -p 8080:80 web-ext
```

## 必要 Secrets 与环境

- **GHCR**：默认 `GITHUB_TOKEN`（service-release）
- **Tauri updater**：`TAURI_SIGNING_PRIVATE_KEY`；`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 无密码时也要为空字符串（不能 unset）
- 如需私有 npm 源，添加 `NPM_TOKEN` 并在工作流中配置

## 发布操作

```bash
git tag v0.1.0
git push origin v0.1.0
```

同一 tag 会并行触发 `client-release` 与 `service-release`。含 `alpha` / `beta` / `rc` 的 tag 会将 client Release 标为 prerelease。

## 常见问题

- pnpm workspace 构建失败：确认 `pnpm-lock.yaml` 与 `turbo.json` 同步。
- Client 桌面包：仅在 `client-release`（Windows）构建；CI 只跑 `build:core`。
- Updater 签名失败：检查仓库 Secrets 是否配置 `TAURI_SIGNING_*`。
- 本地发版（Windows，空密码）：`pnpm build:client` / `pnpm --filter @i-thinking/client build`（`scripts/build.ts` 注入 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""`；私钥仍用系统/终端环境变量）。
- Sidecar 缺失：确认 `apps/client/src-tauri/binaries/` 中已跟踪真实 `corex-serve`（非占位）。

## 后续可选增强

- extension / devtools 独立发布工作流
- `changesets` 自动版本管理
- `turbo prune` + 远程缓存
- Playwright E2E
- macOS / Linux client 安装包（IPC 能力有限）
