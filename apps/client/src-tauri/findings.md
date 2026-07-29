# Findings & Decisions

## Requirements
- magnetic-tile `size` 改为数字类型
- 目前只有 1–7（对应原 mini…ultra）
- 不改 Background.size（CSS）与 Ant Design size props

## Research Findings
- Size 字符串枚举在 `crates/database/src/entity/magnetic_tile.rs`
- DB 默认 `"medium"` → 数字 `3`
- shared: `packages/shared/src/types/magnetic-tile.d.ts`
- 前端大量 `Mirror.Size`，但 Mirror 命名空间未定义 Size/Shape/Direction
- 旁路：extension、studio 也用字符串 size

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| i32 + TS union | 后端宽松、前端收窄 |
| Mirror 别名 | 兼容现有 Mirror.Size 调用 |
| isCompact: size <= 2 | 对应原 mini/small |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| UPDATE 后列声明仍是 TEXT，sqlx 解码失败 | v002/v003 重建表为 INTEGER |

## Resources
- Entity: `crates/database/src/entity/magnetic_tile.rs`
- Migration: `crates/database/src/migrations/`
- Shared: `packages/shared/src/types/magnetic-tile.d.ts`
- SIZE_PX: `apps/client/src/features/magnetic-tile/size.ts`
