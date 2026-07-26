type OverlayOpener = (visible: boolean) => void

const OPENERS = new Map<string, OverlayOpener>()

function registerOverlayOpener(applicationId: string, opener: OverlayOpener) {
  OPENERS.set(applicationId, opener)
  return function unregister() {
    const current = OPENERS.get(applicationId)
    if (current === opener) OPENERS.delete(applicationId)
  }
}

function openOverlayById(applicationId: string) {
  const opener = OPENERS.get(applicationId)
  if (!opener) {
    console.warn('[overlay-registry] no opener for', applicationId)
    return false
  }
  opener(true)
  return true
}

export { registerOverlayOpener, openOverlayById }
