/**
 * 把文本写入系统剪贴板。
 *
 * Electron 默认会话若拒掉 `clipboard-sanitized-write`，`navigator.clipboard` 会直接
 * reject（运行台「复制失败」就是这个）。权限放行后仍可能因失焦失败，再走一次
 * `execCommand('copy')` 兜底。
 */
async function copyText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // 失焦 / 权限抖动时落到下面的选区复制
    }
  }

  if (typeof document === 'undefined') {
    throw new Error('当前环境没有可用的剪贴板')
  }

  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  area.style.top = '0'
  document.body.appendChild(area)
  area.select()
  area.setSelectionRange(0, area.value.length)

  try {
    if (!document.execCommand('copy')) {
      throw new Error('document.execCommand(copy) 返回 false')
    }
  } finally {
    document.body.removeChild(area)
  }
}

export { copyText }
