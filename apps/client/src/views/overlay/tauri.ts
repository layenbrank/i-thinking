import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { appLocalDataDir, join } from '@tauri-apps/api/path'
import { BaseDirectory, exists, mkdir, writeFile } from '@tauri-apps/plugin-fs'

import type { MarkerLayout } from '@/features/magnetic-tile/size'
import type { OverlayTileKind } from '@/stores/overlay'

async function ensureOverlay(): Promise<void> {
  await invoke('overlay:ensure')
}

async function hideOverlay(): Promise<void> {
  await invoke('overlay:hide')
}

async function updateOverlayMode(mode: 'idle' | 'capture'): Promise<void> {
  await invoke('overlay:update-mode', { mode })
}

/** 主窗磁贴右键「浮层 → 添加」 */
async function mountOverlayTile(
  kind: OverlayTileKind,
  magneticTileID: string,
  layout?: Partial<MarkerLayout>
): Promise<void> {
  await invoke('overlay:mount', {
    payload: {
      kind,
      magneticTileID,
      size: layout?.size ?? null,
      shape: layout?.shape ?? null,
      direction: layout?.direction ?? null
    }
  })
}

/** 主窗 / 浮层「移除」共用 */
async function removeOverlayTile(magneticTileID: string): Promise<void> {
  await invoke('overlay:unmount', {
    payload: { magneticTileID }
  })
}

async function showMagneticTileOverlay(magneticTileID: string): Promise<void> {
  await invoke('magnetic-tile:show-overlay', {
    payload: { magneticTileID }
  })
}

async function saveTexturePng(dataUrl: string, id: string): Promise<string> {
  if (!(await exists('textures', { baseDir: BaseDirectory.AppLocalData }))) {
    await mkdir('textures', { baseDir: BaseDirectory.AppLocalData, recursive: true })
  }
  const dir = await appLocalDataDir()
  const path = await join(dir, 'textures', `${id}.png`)
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  await writeFile(path, bytes)
  return convertFileSrc(path)
}

function readImageNaturalSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise(function (resolve, reject) {
    const img = new Image()
    img.onload = function () {
      resolve({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

export {
  ensureOverlay,
  hideOverlay,
  updateOverlayMode,
  mountOverlayTile,
  removeOverlayTile,
  showMagneticTileOverlay,
  saveTexturePng,
  readImageNaturalSize
}
