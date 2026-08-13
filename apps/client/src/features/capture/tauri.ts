import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { appLocalDataDir, join } from '@tauri-apps/api/path'
import { writeImage } from '@tauri-apps/plugin-clipboard-manager'
import { BaseDirectory, exists, mkdir, writeFile } from '@tauri-apps/plugin-fs'

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

/** 把 data URL 解码为 Uint8Array（base64 → 字节） */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** 把当前 Konva Stage 的最终画面写到剪贴板（PNG） */
export async function writeImageToClipboard(dataUrl: string): Promise<void> {
  await writeImage(dataUrlToBytes(dataUrl))
}

/**
 * 把 PNG 写入 `<appLocalDataDir>/screenshot/` 目录下，文件名带时间戳。
 * 返回保存后的绝对路径（写入失败抛错）。
 */
export async function savePngToAppDir(dataUrl: string, filename?: string): Promise<string> {
  const dir = await appLocalDataDir()
  const subdir = await join(dir, 'screenshot')
  if (!(await exists('screenshot', { baseDir: BaseDirectory.AppLocalData }))) {
    await mkdir('screenshot', {
      baseDir: BaseDirectory.AppLocalData,
      recursive: true
    })
  }
  const name = filename ?? `screenshot-${formatTimestamp(new Date())}.png`
  const path = await join(subdir, name)
  await writeFile(path, dataUrlToBytes(dataUrl))
  return path
}

function formatTimestamp(d: Date): string {
  const pad = function (n: number) {
    return String(n).padStart(2, '0')
  }
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  )
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

/** 将截图保存为 textures 目录下的 PNG，返回磁盘文件路径 */
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
  return path
}

/** 读取图片的原始尺寸（不依赖 DOM 渲染） */
function readImageNaturalSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise(function (resolve, reject) {
    const img = new Image()
    img.onload = function () {
      resolve({
        w: img.naturalWidth,
        h: img.naturalHeight
      })
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

/** 将截图资源注册到 asset 表 */
export async function registerAsset(
  filePath: string,
  fileName: string,
  mime: string
): Promise<void> {
  await invoke('asset:insert', {
    params: {
      filePath,
      fileName,
      mime,
      kind: 'image',
      hash: null,
      sha: null,
      size: null,
      index: null,
      extension: '',
      metadata: null,
      status: null,
      deviceID: null,
      archivedAt: null,
      tenantID: null
    }
  })
}

export {
  ensureOverlay,
  hideOverlay,
  updateOverlayMode,
  mountOverlayTile,
  removeOverlayTile,
  saveTexturePng,
  readImageNaturalSize
}
export type { MountOverlayOptions }
