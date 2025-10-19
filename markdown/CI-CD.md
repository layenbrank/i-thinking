# Monorepo CI/CD 指南 (pnpm + Turborepo + GitHub Actions)

本文档说明当前仓库的 CI/CD 设计与使用方法，覆盖：质量检查、构建、发布镜像、前端产物与文档部署。

## 目标

- PR 自动质量门禁：安装、lint、类型检查、测试、全量构建，上传产物以便预览排查。
- Release 自动发布：根据 tag 构建并推送 NestJS 镜像到 GHCR，同时打包前端静态资源为制品。
- Docs 自动部署：推送到 main 自动发布 VitePress 到 GitHub Pages。

## 目录结构要点

- apps/service：NestJS 服务（端口 9000，产物在 `dist/`）
- apps/client-vue、apps/client、apps/extension、apps/devtools：Vite/Tauri 前端（Web 构建产物在 `dist/`）
- packages/\*：共享包（产物在 `dist/`）

## 工作流

### 1) CI（PR/Develop）

文件：`.github/workflows/ci.yml`

- 触发：PR 到 main/develop，或 push 到 develop
- 步骤：
  - 安装 Node 22 + pnpm 10，缓存 pnpm store
  - `pnpm install --frozen-lockfile`
  - `pnpm lint`
  - 类型检查（针对有命令的包）
  - 单元测试（NestJS）
  - `pnpm build`（Turborepo 带缓存）
  - 上传 `apps/**/dist/**`、`packages/**/dist/**` 为制品

### 2) Release（打 Tag）

文件：`.github/workflows/release.yml`

- 触发：push tag `v*.*.*`
- Job A：使用 `apps/service/Dockerfile` 多阶段构建并推送镜像到 GHCR
- Job B：安装依赖并构建前端，上传 `dist/` 作为制品
- 需要的权限：packages: write（推镜像）

镜像命名：`ghcr.io/<owner>/<repo>-service:<tag>`

### 3) Pages（Docs）

文件：`.github/workflows/pages.yml`

- 触发：main 分支变更 `apps/docs/**`
- 构建 `apps/docs` 并发布到 GitHub Pages

## Docker

### 服务镜像（NestJS）

文件：`apps/service/Dockerfile`

- 基于 node:22-alpine 多阶段构建
- 运行时仅复制 `dist/`，使用非 root 用户
- CMD：`node dist/main.js`

构建示例：

```bash
# 本地构建
docker build -t my-service -f apps/service/Dockerfile .
# 运行（默认端口 9000，按需调整环境变量）
docker run -p 9000:9000 my-service
```

### 通用前端镜像（Nginx）

文件：`docker/Dockerfile.web`

- 通过 `--build-arg APP_DIR=apps/extension` 指定要构建的前端
- 构建完成后用 nginx:alpine 提供静态资源

示例：

```bash
docker build -t web-ext -f docker/Dockerfile.web --build-arg APP_DIR=apps/extension .
docker run -p 8080:80 web-ext
```

## 必要 Secrets 与环境

- GitHub Packages（GHCR）：默认使用 `GITHUB_TOKEN` 自动登录
- 如需私有 npm 源，添加 `NPM_TOKEN` 并在工作流中配置

## 常见问题

- pnpm workspace 构建失败：确认 `pnpm-lock.yaml` 与 `turbo.json` 同步，避免跨包循环依赖。
- Tauri 构建：当前 CI 默认构建 `build:web` 或 `build`（tauri build 需要系统依赖，通常不在 CI 执行）。如需构建桌面包，建议创建独立 workflow 并使用 matrix 指定 OS。
- 缓存未命中：升级 pnpm/action-setup + actions/cache 并确保 lockfile 作为 key。

## 后续可选增强

- 使用 `changesets` 自动版本管理与发布
- 使用 `turbo prune` + 远程缓存加速 CI
- 增加 E2E 测试（Playwright）
- 配置 S3/OSS 部署前端产物
