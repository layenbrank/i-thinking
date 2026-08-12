import { convertFileSrc } from '@tauri-apps/api/core'

/**
 * 将贴图 src 统一解析为可直接赋给 <img> 的 URL。
 * 兼容三种格式：base64 data URL、asset:// URL、磁盘文件路径。
 */
function resolveTextureSrc(src: string): string {
  if (!src) return src
  if (src.startsWith('data:') || src.startsWith('asset:') || src.startsWith('http')) return src
  return convertFileSrc(src)
}

export { resolveTextureSrc }
