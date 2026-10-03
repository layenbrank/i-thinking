/**
 * PNG 字节 → Blob URL（同源，Konva toDataURL 不染污）。
 * 调用方在不再需要时必须 revokeBlobUrl。
 */
function buildBlobUrl(bytes: Uint8Array): string {
  return URL.createObjectURL(new Blob([bytes], { type: 'image/png' }))
}

/** data URL → Blob URL；贴图路径：Konva 仍产出 data URL，显示侧立刻转 Blob 后可丢字符串 */
async function buildBlobUrlFromDataUrl(dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob()
  return URL.createObjectURL(blob)
}

function revokeBlobUrl(url: string | null | undefined): void {
  if (!url || !url.startsWith('blob:')) return
  URL.revokeObjectURL(url)
}

/** Blob / data URL → HTMLImageElement */
async function decodeImage(url: string): Promise<HTMLImageElement> {
  const image = new Image()
  image.decoding = 'async'

  await new Promise<void>(function (resolve, reject) {
    image.onload = function () {
      resolve()
    }
    image.onerror = function () {
      reject(new Error('decodeImage failed'))
    }
    image.src = url
  })

  try {
    await image.decode()
  } catch {
    throw new Error('decodeImage decode failed')
  }
  return image
}

/** bytes → 解码图 + 可 revoke 的 Blob URL */
async function decodeImageFromBytes(
  bytes: Uint8Array
): Promise<{ image: HTMLImageElement; url: string }> {
  const url = buildBlobUrl(bytes)
  try {
    const image = await decodeImage(url)
    return { image, url }
  } catch (error) {
    revokeBlobUrl(url)
    throw error
  }
}

export {
  buildBlobUrl,
  buildBlobUrlFromDataUrl,
  decodeImage,
  decodeImageFromBytes,
  revokeBlobUrl
}
