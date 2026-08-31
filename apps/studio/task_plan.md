# Task Plan: Studio 破坏性去兼容与企业级架构

## Goal
以本计划为 SSOT，落地 shared IPC 契约单源 + main 域模块 + preload 薄桥 + forge 仅打包；删除 Corex legacy 与空壳 record API。

## Current Phase
Phase 5: Verification（complete）

## Phases

### Phase 0: Planning files
- [x] 重置 task_plan / findings / progress
- **Status:** complete

### Phase 1: Corex / Sidecar 去兼容
- [x] 删 invoke / mapLegacy* / findModules / hasModule
- [x] SidecarStatus.modules → actions
- **Status:** complete

### Phase 2: 删除 record IPC
- [x] 全链删除 recordStart/Stop + Overview 调用
- **Status:** complete

### Phase 3: shared 契约下沉
- [x] IPC DTO 迁入 shared
- [x] shared ESLint 边界
- [x] 契约同步测试
- **Status:** complete

### Phase 4: 截图契约 + 文档重写
- [x] 钉死 parseCapturePath
- [x] 按 SSOT 重写 docs
- **Status:** complete

### Phase 5: 验证
- [x] vitest 全绿；preload tsc 绿；main 仅存量 Prisma user 债
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 本计划为架构 SSOT | 旧 docs/architecture.md 仅历史参考 |
| 仅 IPC DTO 进 shared | 避免实现细节泄漏 |
| 本轮不抽 SidecarPort | 仅一个 daemon；第二 sidecar 再抽 |
| parseCapturePath 仅 string \| { path } | 去掉 File/to/fallback 多形状 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| main tsc: prisma.user 不存在 | 1 | 存量债（schema 仅 Auth/Application）；与本改动无关，未扩 scope |
