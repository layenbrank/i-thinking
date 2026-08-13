import { convertFileSrc, invoke } from '@tauri-apps/api/core'

import type { SurfaceStyleInput } from '@/features/magnetic-tile/surface-style'
import type { MarkerLayout } from '@/features/magnetic-tile/size'

/**
 * Tauri 截图能力的轻量封装，前端通过这些函数与 Rust 端的
 * `capture:screenshot` 命令通信。
 */

export interface ScreenshotResult {
  /** 截图保存后的磁盘绝对路径 */
  path: string
  width: number
  height: number
  scale_factor: number
}

/** 仅在 Tauri 运行时返回 true */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** 主显示器即时截图（不弹窗，返回截图文件路径） */
export async function takeScreenshot(): Promise<ScreenshotResult> {
  return invoke<ScreenshotResult>('capture:screenshot')
}

/** 将磁盘图片路径加载为 HTMLImageElement（通过 fetch + blob 避免 asset:// 的 canvas tainting） */
export async function loadImageFromPath(filePath: string): Promise<HTMLImageElement> {
  const assetUrl = convertFileSrc(filePath)
  const resp = await fetch(assetUrl)
  if (!resp.ok) {
    throw new Error(`loadImageFromPath: 读取图片失败 (status ${resp.status}) - ${filePath}`)
  }
  const blob = await resp.blob()
  const blobUrl = URL.createObjectURL(blob)
  return new Promise(function (resolve, reject) {
    const img = new Image()
    img.onload = function () {
      URL.revokeObjectURL(blobUrl)
      resolve(img)
    }
    img.onerror = function () {
      URL.revokeObjectURL(blobUrl)
      reject(new Error(`loadImageFromPath: 图片解码失败 - ${filePath}`))
    }
    img.src = blobUrl
  })
}

/** 将 data URL 解码为 HTMLImageElement（用于喂给 react-konva / canvas） */
export function loadDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise(function (resolve, reject) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = function () {
      resolve(img)
    }
    img.onerror = function (event) {
      reject(event)
    }
    img.src = dataUrl
  })
}

/* ─── Overlay 窗口管理（原 views/overlay/tauri.ts） ─── */

interface MountOverlayOptions extends Partial<MarkerLayout>, SurfaceStyleInput {}

async function ensureOverlay(): Promise<void> {
  await invoke('overlay:ensure')
}

async function hideOverlay(): Promise<void> {
  await invoke('overlay:hide')
}

async function updateOverlayMode(mode: 'idle' | 'screenshot'): Promise<void> {
  await invoke('overlay:update-mode', { mode })
}

/** 主窗磁贴右键「浮层 → 添加」 */
async function mountOverlayTile(
  kind: MagneticTile.Component,
  magneticTileID: string,
  options?: MountOverlayOptions
): Promise<void> {
  await invoke('overlay:mount', {
    payload: {
      kind,
      magneticTileID,
      size: options?.size ?? null,
      shape: options?.shape ?? null,
      direction: options?.direction ?? null,
      round: options?.round ?? null,
      background: options?.background ?? null
    }
  })
}

/** 主窗 / 浮层「移除」共用 */
async function removeOverlayTile(magneticTileID: string): Promise<void> {
  await invoke('overlay:unmount', {
    payload: { magneticTileID }
  })
}

export {
  ensureOverlay,
  hideOverlay,
  updateOverlayMode,
  mountOverlayTile,
  removeOverlayTile
}
export type { MountOverlayOptions }
