# Progress Log

## Session: Magnetic Tiles Rename

- Phase 0–4: complete (rename + overlay bugs)
- Phase 5: polish verify
  - shared package exports → magnetic-tile*
  - client/extension tsconfig types updated
  - CSS vars/mixin → magnetic-tile
  - collection drawer/overlay applications → magneticTiles
  - overlay_set_mode → overlay_update_mode
  - countdown STATUS_LABELS + save validation
  - extension components/applications → magnetic-tiles
  - `bunx tsc --noEmit` + `cargo check` green

## Verify
- cargo check — ok
- tsc --noEmit — ok
- Note: local DB table renamed `application` → `magnetic_tile` / Dexie `magneticTile` (reset OK)
