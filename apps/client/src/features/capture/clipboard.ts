import { writeImage, writeText } from '@tauri-apps/plugin-clipboard-manager'
import { invoke } from '@tauri-apps/api/core'
import { appLocalDataDir, join } from '@tauri-apps/api/path'
import { BaseDirectory, exists, mkdir, writeFile } from '@tauri-apps/plugin-fs'
import { save as dialogSave } from '@tauri-apps/plugin-dialog'

/** 将文本写入系统剪贴板 */
export async function copyText(text: string): Promise<void> {
  await writeText(text)
}

/** 将 data URL 图片写入系统剪贴板（PNG） */
export async function copyImage(dataUrl: string): Promise<void> {
  const bytes = dataUrlToBytes(dataUrl)
  await writeImage(bytes)
}

/**
 * 把截图保存为 textures 目录下的 PNG 并注册到 asset 表，
 * 返回 { filePath, w, h } 供磁贴消费。
 */
export async function pinTexture(
  dataUrl: string
): Promise<{ filePath: string; w: number; h: number }> {
  // 读取原始尺寸
  const naturalSize = await new Promise<{ w: number; h: number }>(function (resolve, reject) {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = reject
    img.src = dataUrl
  })

  // 等比缩放到 maxEdge
  const maxEdge = 480
  const scale = Math.min(1, maxEdge / Math.max(naturalSize.w, naturalSize.h))
  const w = Math.max(48, Math.round(naturalSize.w * scale))
  const h = Math.max(48, Math.round(naturalSize.h * scale))

  // 写入 textures/<id>.png
  const id = `texture-${Date.now()}`
  if (!(await exists('textures', { baseDir: BaseDirectory.AppLocalData }))) {
    await mkdir('textures', { baseDir: BaseDirectory.AppLocalData, recursive: true })
  }
  const dir = await appLocalDataDir()
  const filePath = await join(dir, 'textures', `${id}.png`)
  await writeFile(filePath, dataUrlToBytes(dataUrl))

  // 注册到 asset 表
  await invoke('asset:insert', {
    params: {
      filePath,
      fileName: `${id}.png`,
      mime: 'image/png',
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

  return { filePath, w, h }
}

/* ─── internal helpers ─── */

const PNG_FILTER = [{ name: 'PNG 图片', extensions: ['png'] }]

/** 弹出系统保存对话框，将裁剪+标注后的 PNG 写入用户选择的路径 */
export async function saveToUserPath(dataUrl: string): Promise<string | null> {
  const defaultName = `screenshot-${formatTimestamp(new Date())}.png`
  const dest = await dialogSave({
    defaultPath: defaultName,
    filters: PNG_FILTER
  })
  if (!dest) return null
  await writeFile(dest, dataUrlToBytes(dataUrl))
  return dest
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
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
