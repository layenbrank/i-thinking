# Progress Log

## Session: 2026-07-29

### Phase 0–5: size → 1–7
- **Status:** complete
- Actions taken:
  - Entity Size 枚举改为 i32；overlay payload 同步
  - v001 默认 integer 3；v002/v003 重建 magneticTile 表
  - shared MagneticTile.Size = 1\|…\|7；Mirror 别名
  - client/extension/studio 字面量与 SIZE_PX/isCompact 更新
  - cargo check + migration_runs_on_empty_sqlite 通过
- Files created/modified:
  - crates/database/src/entity/magnetic_tile.rs
  - crates/database/src/migrations/migrations_v00{1,2,3}.rs
  - crates/core/src/magnetic_tile/service.rs
  - src/overlay/state.rs
  - packages/shared/src/types/{magnetic-tile,mirror}.d.ts
  - apps/client size.ts / booth / markers / constants / overlay.test
  - apps/extension + studio 默认 size

## Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| cargo check | ok | ok | pass |
| migration_runs_on_empty_sqlite | ok | ok | pass |

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | All phases complete |
| Where am I going? | Done |
| What's the goal? | size → 数字 1–7 |
| What have I learned? | SQLite 改类型必须重建表 |
| What have I done? | See above |
