import { invoke } from '@tauri-apps/api/core'

import type { OverlayPanelKind } from '@/stores/overlay'

export async function ensureOverlay(): Promise<void> {
  await invoke('overlay_ensure')
}

export async function hideOverlay(): Promise<void> {
  await invoke('overlay_hide')
}

export async function setOverlayMode(mode: 'idle' | 'capture'): Promise<void> {
  await invoke('overlay_set_mode', { mode })
}

/** Open overlay (if needed) and ask the shell to mount a singleton panel widget. */
export async function openOverlayPanel(
  kind: OverlayPanelKind,
  applicationId?: string
): Promise<void> {
  await invoke('overlay_mount', {
    kind,
    applicationId: applicationId ?? null
  })
}

/**
 * Persist a PNG data URL under AppLocalData/pins and return a file URL for <img>.
 */
export async function savePinPng(dataUrl: string, id: string): Promise<string> {
  const { convertFileSrc } = await import('@tauri-apps/api/core')
  const [{ appLocalDataDir, join }, { mkdir, writeFile, exists, BaseDirectory }] =
    await Promise.all([import('@tauri-apps/api/path'), import('@tauri-apps/plugin-fs')])

  if (!(await exists('pins', { baseDir: BaseDirectory.AppLocalData }))) {
    await mkdir('pins', { baseDir: BaseDirectory.AppLocalData, recursive: true })
  }
  const dir = await appLocalDataDir()
  const path = await join(dir, 'pins', `${id}.png`)
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  await writeFile(path, bytes)
  return convertFileSrc(path)
}

export function readImageNaturalSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise(function (resolve, reject) {
    const img = new Image()
    img.onload = function () {
      resolve({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.onerror = reject
    img.src = dataUrl
  })
}
