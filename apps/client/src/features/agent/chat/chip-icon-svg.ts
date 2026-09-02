/**
 * 纯 DOM chip 用：从已打包的 mdi 集生成内联 SVG（无需 createRoot）
 */
import type { IconifyJSON } from '@iconify/types'
import { getIconData, iconToHTML, iconToSVG } from '@iconify/utils'
import MDIconify from '@iconify/json/json/mdi.json'

const SVG_CACHE = new Map<string, string>()

function findChipIconSvg(icon: string, size = 12) {
  const cacheKey = `${icon}@${size}`
  const cached = SVG_CACHE.get(cacheKey)
  if (cached) return cached

  const sep = icon.indexOf(':')
  if (sep <= 0) return ''
  const prefix = icon.slice(0, sep)
  const name = icon.slice(sep + 1)
  if (prefix !== 'mdi' || !name) return ''

  const data = getIconData(MDIconify as IconifyJSON, name)
  if (!data) return ''

  const svg = iconToSVG(data, { height: `${size}px` })
  const html = iconToHTML(svg.body, {
    ...svg.attributes,
    width: String(size),
    height: String(size),
    'aria-hidden': 'true'
  })
  SVG_CACHE.set(cacheKey, html)
  return html
}

export { findChipIconSvg }
