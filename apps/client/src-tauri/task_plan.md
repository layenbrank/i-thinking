# Task Plan: Magnetic-tile size → 数字 1–7

## Goal
将 magnetic-tile 的 `size` 从字符串枚举（mini…ultra）改为数字 1–7，同步 Rust entity/DB、shared 类型与前端消费方。

## Current Phase
Phase 5 complete

## Phases

### Phase 0: Planning files
- [x] 重写 task_plan / findings / progress
- **Status:** complete

### Phase 1: Rust entity + service
- [x] Size 枚举 → i32
- [x] service 过滤去掉 clone
- [x] overlay payload size → Option\<i32\>
- **Status:** complete

### Phase 2: DB migration
- [x] v001 Size 列改为 integer default 3
- [x] 删除 v002/v003，仅保留 v001
- **Status:** complete

### Phase 3: Shared 类型
- [x] MagneticTile.Size = 1\|…\|7
- [x] Mirror 补 Size/Shape/Direction 别名
- **Status:** complete

### Phase 4: 前端消费方
- [x] client SIZE_PX / 字面量 / isCompact
- [x] extension + studio
- **Status:** complete

### Phase 5: Verify
- [x] cargo check + migration test + 残留字符串排查
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Rust 用 i32 | 与 index / download_count 一致；不硬校验便于扩展 |
| TS 用 1\|2\|…\|7 | 当前只有 7 档，类型收窄 |
| v001 合并，无增量迁移 | 开发期清库即可；size 直接 INTEGER default 3 |
| 映射 1=mini … 7=ultra | 按 SIZE_PX 升序 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| size TEXT vs Option\<i32\> | 1 | v002/v003 重建表为 INTEGER |
| query_all_unprepared 不存在 | 1 | v003 改为无条件重建 |
