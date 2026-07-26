type ShowOverlay = (visible: boolean) => void

const SHOW_OVERLAYS = new Map<string, ShowOverlay>()

function registerShowOverlay(magneticTileID: string, show: ShowOverlay) {
  SHOW_OVERLAYS.set(magneticTileID, show)
  return function unregister() {
    const current = SHOW_OVERLAYS.get(magneticTileID)
    if (current === show) SHOW_OVERLAYS.delete(magneticTileID)
  }
}

function showMagneticTileOverlay(magneticTileID: string) {
  const show = SHOW_OVERLAYS.get(magneticTileID)
  if (!show) {
    console.warn('[overlay-registry] no show handler for', magneticTileID)
    return false
  }
  show(true)
  return true
}

export { registerShowOverlay, showMagneticTileOverlay }
