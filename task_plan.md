# Task Plan: corex 就绪竞态修复 + Cargo.toml 整理

## Goal
消除 App 挂载时对 corex「未就绪」的误报（三态 pending/ready/failed），并整理 Cargo.toml 分组注释、移除纯库死依赖。

## Current Phase
Complete

## Phases

### Phase 1: CorexState settled + 路径落态
- [x] CorexState 增加 settled；status() -> Option<bool>
- [x] wait_for_daemon / spawn Err / Terminated 调用 fail() + emit
- **Status:** complete

### Phase 2: 前端 ipc_ready 探针
- [x] ipc_ready 返回 Option<bool>
- [x] App.tsx 仅 ready === false 告警，防双弹
- **Status:** complete

### Phase 3: Cargo.toml
- [x] 分组 + 中文注释
- [x] 删除 libc/urlencoding/sha2/machine-uid/hostname/dirs/tracing-subscriber
- [x] 不删 tauri* / sea*
- [x] cargo check 通过
- **Status:** complete

### Phase 4: 规划文件
- [x] 更新 task_plan.md / findings.md / progress.md
- **Status:** complete

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| （无） | — | — |
