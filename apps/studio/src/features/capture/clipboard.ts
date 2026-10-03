/**
 * 截屏导出：剪贴板 / 用户另存 / 贴图（textures + asset 表）。
 */

import { buildBlobUrlFromDataUrl } from '@/features/capture/image'

async function copyText(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error('clipboard writeText unavailable')
  }
  await navigator.clipboard.writeText(text)
}

async function copyImage(dataUrl: string): Promise<void> {
  const blob = await (await fetch(dataUrl)).blob()
  if (!navigator.clipboard?.write) {
    throw new Error('clipboard write unavailable')
  }
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
}

async function pinTexture(
  dataUrl: string
): Promise<{ id: string; filePath: string; url: string; w: number; h: number }> {
  const naturalSize = await readNaturalSize(dataUrl)
  const dpr = Math.max(1, window.devicePixelRatio || 1)
  const w = Math.max(48, Math.round(naturalSize.w / dpr))
  const h = Math.max(48, Math.round(naturalSize.h / dpr))
  const pinned = await window.itc.asset.toPin({ dataUrl })
  const url = await buildBlobUrlFromDataUrl(dataUrl)
  return {
    id: pinned.id,
    filePath: pinned.filePath,
    url,
    w,
    h
  }
}

async function saveToUserPath(dataUrl: string): Promise<string | null> {
  const dest = await window.itc.dialog.save({
    defaultPath: `screenshot-${formatTimestamp(new Date())}.png`,
    filters: [{ name: 'PNG 图片', extensions: ['png'] }]
  })
  if (!dest) return null
  await window.itc.asset.toExport({ dataUrl, filePath: dest })
  return dest
}

function readNaturalSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise(function (resolve, reject) {
    const image = new Image()
    image.onload = function () {
      resolve({ w: image.naturalWidth, h: image.naturalHeight })
    }
    image.onerror = reject
    image.src = dataUrl
  })
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

export { copyImage, copyText, pinTexture, saveToUserPath }
