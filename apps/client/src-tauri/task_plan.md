# Task Plan: AI 存储模块

## Goal
新增 aiCollection / aiSession / aiMessage 持久化（v001 扩展），前端 store 接入 Tauri invoke，修复 intelligence overlay 会话隔离。

## Current Phase
All phases complete

## Phases

### Phase 1: Planning files
- [x] task_plan / findings / progress
- **Status:** complete

### Phase 2: Database
- [x] migrations_v001 三表 + 索引 + FK
- [x] entity aiCollection / aiSession / aiMessage
- **Status:** complete

### Phase 3: Core + Command
- [x] ai* Service（toRead/toWrite/toUpdate/toRemove）
- [x] ai* Command + handlers
- **Status:** complete

### Phase 4: Skill
- [x] naming-conventions 更新
- **Status:** complete

### Phase 5: Frontend
- [x] intelligence.ts store + plugin + overlay fixes
- **Status:** complete

### Phase 6: Verify
- [x] cargo check 通过
- **Status:** complete

## Decisions
| Decision | Rationale |
|----------|-----------|
| v001 内联 DDL | 用户要求不升迁移版本 |
| camelCase 模块 + to* IPC | aiSession:toWrite 等新规范 |
| lib.rs 内联 mod | 参考 src/lib.rs，无 mod.rs |

## Errors
| Error | Attempt | Resolution |
|-------|---------|------------|
|       |         |            |
