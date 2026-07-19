# Task Plan: Studio 企业级架构 B+A

## Goal
将 apps/studio 重构为域模块 + 组合根 + 契约 IPC + 安全基线；移除 Nest sidecar；废除任意 SQL IPC。

## Current Phase
Phase 4 — complete

## Phases

### Phase 1: 去 Nest + 入口骨架
- [x] 移除 sidecar / Forge service / build 串联
- [x] 建立 main/preload/shared 骨架
- **Status:** complete

### Phase 2: 契约 / Bridge / Result
- [x] shared/ipc + window.studio
- **Status:** complete

### Phase 3: 域模块迁入
- [x] store/dialog/database/bin/window/security/devtools
- **Status:** complete

### Phase 4: 安全收尾 + 验收
- [x] CSP/导航/测试/package
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 组合根非装饰器 DI | 可读可测 |
| 废除 raw SQL IPC | XSS 威胁模型 |
| UI 保留 src/ 根路径 | 减少无意义搬迁；入口与 lib 进 renderer/ |
| Forge 入口 main.ts/preload.ts | 避免 index.js 命名冲突 |
| ALLOWED_BINS 含 corex/generate/service.exe | 与 src/bin 一致 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| erasableSyntaxOnly parameter props | 1 | 改写 DialogService 构造函数 |
| Forge index.js 冲突风险 | 1 | 入口改为 main.ts / preload.ts |
