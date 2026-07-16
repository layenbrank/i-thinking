import { invoke } from '@tauri-apps/api/core'

/**
 * Tauri 截图能力的轻量封装，前端通过这些函数与 Rust 端的
 * `screenshot:capture / screenshot:open / screenshot:close` 命令通信。
 */

export interface CaptureResult {
  /** PNG data URL（base64），可直接赋给 <img.src> 或喂给 new Image() */
  data_url: string
  width: number
  height: number
  scale_factor: number
}

/** 仅在 Tauri 运行时返回 true */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** 主显示器即时截图（不弹窗，返回 PNG data URL） */
export async function captureScreen(): Promise<CaptureResult> {
  return invoke<CaptureResult>('screenshot:capture')
}

/** 弹出全屏透明截图窗口（懒加载窗口） */
export async function openScreenshotWindow(): Promise<void> {
  return invoke<void>('screenshot:open')
}

/** 关闭截图窗口 */
export async function closeScreenshotWindow(): Promise<void> {
  return invoke<void>('screenshot:close')
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
  const { writeImage } = await import('@tauri-apps/plugin-clipboard-manager')
  await writeImage(dataUrlToBytes(dataUrl))
}

/**
 * 把 PNG 写入 `<appLocalDataDir>/screenshot/` 目录下，文件名带时间戳。
 * 返回保存后的绝对路径（写入失败抛错）。
 */
export async function savePngToAppDir(dataUrl: string, filename?: string): Promise<string> {
  const [{ appLocalDataDir, join }, { mkdir, writeFile, exists, BaseDirectory }] =
    await Promise.all([import('@tauri-apps/api/path'), import('@tauri-apps/plugin-fs')])

  const dir = await appLocalDataDir()
  const subdir = await join(dir, 'screenshot')
  // 使用 BaseDirectory.AppLocalData 作为权限边界，目录不存在则创建
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

/** 弹出系统保存对话框并写入磁盘（用于「另存为」场景） */
export async function savePngWithDialog(
  dataUrl: string,
  suggested?: string
): Promise<string | null> {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const { writeFile } = await import('@tauri-apps/plugin-fs')
  const path = await save({
    defaultPath: suggested ?? `screenshot-${formatTimestamp(new Date())}.png`,
    filters: [{ name: 'PNG', extensions: ['png'] }]
  })
  if (!path) return null
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
