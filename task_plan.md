# Task Plan: Magnetic Tiles Rename + Overlay Fixes

## Goal
Application → Magnetic Tiles（MagneticTile）；禁止业务 widget；Rust/IPC 四层命名；修 overlay 缺陷。

## Current Phase
Phase 5: Verify — complete

## Phases
### Phase 0: Glossary — complete
### Phase 1: Frontend MagneticTile — complete
### Phase 2: Overlay no widget — complete
### Phase 3: Rust / DB / IPC — complete
### Phase 4: Overlay bugs — complete
### Phase 5: Verify — complete

## Decisions
| Decision | Rationale |
|----------|-----------|
| MagneticTile 复合词 | 磁贴＝Magnetic Tiles，禁止孤立 Tile |
| xxxID | 一律大写 ID；serde / IPC 参数 magneticTileID |
| show 非 open | magnetic-tile:show-overlay；浮层 mount/unmount |
| IPC magnetic-tile:* | naming-conventions 四层 |
| 表 magnetic_tile | 破换无兼容 |
