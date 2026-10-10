/**
 * 将剪贴板 / 拖放中的图片写入本地，供 Agent 附件使用
 */
import { appLocalDataDir, join } from '@tauri-apps/api/path'
import { BaseDirectory, exists, mkdir, writeFile } from '@tauri-apps/plugin-fs'

import { isImageFile } from '@/features/agent/model/file-icon'
import type { FilePartData } from '@/features/agent/types'

const PASTE_DIR = 'agent-paste'

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif'
}

function parseMimeExt(mime: string) {
  return MIME_EXT[mime.toLowerCase()] || ''
}

function parseFileExt(name: string) {
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return ''
  return name.slice(dot + 1).toLowerCase()
}

function collectClipboardImages(data: DataTransfer | null) {
  if (!data) return [] as File[]
  const files: File[] = []
  const seen = new Set<File>()

  for (const item of Array.from(data.items || [])) {
    if (item.kind !== 'file') continue
    if (!item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (!file || seen.has(file)) continue
    seen.add(file)
    files.push(file)
  }

  for (const file of Array.from(data.files || [])) {
    if (seen.has(file)) continue
    if (!file.type.startsWith('image/') && !isImageFile(file.name)) continue
    seen.add(file)
    files.push(file)
  }

  return files
}

async function ensurePasteDir() {
  if (!(await exists(PASTE_DIR, { baseDir: BaseDirectory.AppLocalData }))) {
    await mkdir(PASTE_DIR, { baseDir: BaseDirectory.AppLocalData, recursive: true })
  }
}

async function savePasteImage(file: File): Promise<FilePartData> {
  await ensurePasteDir()
  const ext = parseFileExt(file.name) || parseMimeExt(file.type) || 'png'
  const safeBase =
    file.name && file.name !== 'image.png' && !file.name.startsWith('image.')
      ? file.name.replace(/[\\/:*?"<>|]+/g, '_')
      : `paste-${Date.now()}.${ext}`
  const name = isImageFile(safeBase) ? safeBase : `${safeBase}.${ext}`
  const dir = await appLocalDataDir()
  const path = await join(dir, PASTE_DIR, name)
  const bytes = new Uint8Array(await file.arrayBuffer())
  await writeFile(path, bytes)
  return { path: path.replace(/\\/g, '/'), name, size: bytes.byteLength }
}

export { collectClipboardImages, savePasteImage }
