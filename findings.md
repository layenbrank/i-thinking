# Findings: Magnetic Tiles Rename

## Casing
- PascalCase: MagneticTile
- camelCase: magneticTileID
- kebab: magnetic-tile, features/magnetic-tiles
- snake: magnetic_tile, magnetic_tile_id
- IPC: magnetic-tile:show-overlay / write / read / update / remove

## ID
- Forbidden: *Id (magneticTileId, applicationId)
- Required: magneticTileID; Rust #[serde(rename = "magneticTileID")]

## No open / no widget
- showMagneticTileOverlay, registerShowOverlay, mountOverlayPanel
- OverlayItem / items / panels/Panel
- Third-party widget APIs untouched

## Scope done
- FE: features/magnetic-tile(s); shared magnetic-tile*; CSS --magnetic-tile-*
- Overlay: Item/panels; pending unmount; Modal open discarded
- Rust: entity/service/command magnetic_tile; table magnetic_tile
- Extension: components/magnetic-tiles; Dexie magneticTile (v2); types MagneticTile
- Countdown: computeCountdown + isValidShift (workEnd > workStart)
