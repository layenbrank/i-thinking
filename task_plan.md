# Task Plan: Client / Service 独立发布工作流

## Goal
为 client 新增 Windows Tauri + GitHub Release 工作流，将 service 镜像推送拆成独立工作流，清理旧 CD，并统一 Actions / Node / pnpm 版本。

## Current Phase
Phase 5 (complete)

## Phases

### Phase 1: client-release.yaml
- [x] 新增 Windows Tauri + softprops/gh-release 工作流
- **Status:** complete

### Phase 2: service-release.yaml
- [x] 从 CD 拆出 GHCR 推送工作流
- **Status:** complete

### Phase 3: 清理旧 CD
- [x] 删除 continuous-delivery.yaml 与 continuous-deployment.yaml
- **Status:** complete

### Phase 4: 对齐 CI / studio / pages
- [x] checkout@v6、cache@v5、Node 24、pnpm 11；CI client 用 build:core
- **Status:** complete

### Phase 5: 更新 CI-CD 文档
- [x] 更新 markdown/CI-CD.md
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Windows-only client release | 对齐 corex；IPC sidecar 主要 Windows |
| softprops/action-gh-release@v3 | 对齐 corex 发布流程 |
| 已入库 sidecar | CI 无需 checkout/构建 corex |
| Node 24 / pnpm 11 | 对齐根 package.json |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |
