import { invoke } from '@tauri-apps/api/core'

import type { MarkerLayout } from '@/features/application/size'
import type { OverlayPanelKind } from '@/stores/overlay'

export async function ensureOverlay(): Promise<void> {
  await invoke('overlay:ensure')
}

export async function hideOverlay(): Promise<void> {
  await invoke('overlay:hide')
}

export async function setOverlayMode(mode: 'idle' | 'capture'): Promise<void> {
  await invoke('overlay:update-mode', { mode })
}

/**
 * Open overlay (if needed) and mount a singleton panel widget.
 * 由应用右键「浮层 → 添加」调用；overview 磁贴双击勿调用。
 */
export async function openOverlayPanel(
  kind: OverlayPanelKind,
  applicationId?: string,
  layout?: Partial<MarkerLayout>
): Promise<void> {
  await invoke('overlay:mount', {
    kind,
    applicationId: applicationId ?? null,
    size: layout?.size ?? null,
    shape: layout?.shape ?? null,
    direction: layout?.direction ?? null
  })
}

/**
 * Remove a singleton panel widget by kind.
 * 由应用右键「浮层 → 移除」调用。
 */
export async function removeOverlayPanel(kind: OverlayPanelKind): Promise<void> {
  await invoke('overlay:unmount', { kind })
}

export async function openApplicationOverlay(applicationId: string): Promise<void> {
  await invoke('application:open-overlay', { applicationId })
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
