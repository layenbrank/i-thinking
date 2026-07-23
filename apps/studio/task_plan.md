# Task Plan: 精简 database 分层

## Goal
删除 DatabaseService 的 1:1 透传，handlers 直接组合 UserRepository；文档标明 Service 为可选用例层。

## Current Phase
Phase 3: Verification（complete）

## Phases

### Phase 1: Requirements & Discovery
- [x] 确认 DatabaseService 为纯透传
- [x] 选定方案：handlers → Repository
- **Status:** complete

### Phase 2: Implementation
- [x] 写入 planning 文件
- [x] 删除 service.ts；改 handlers / index
- [x] 更新 modules.md / architecture.md
- **Status:** complete

### Phase 3: Verification
- [x] tsc -p tsconfig.main.json
- [x] 确认无 DatabaseService 残留
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 删除 DatabaseService | 纯 CRUD 透传无业务价值，属 anemic pass-through |
| CRUD 走 handlers → Repository | 与「repository API only」一致；有编排/事务再加用例 Service |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |
