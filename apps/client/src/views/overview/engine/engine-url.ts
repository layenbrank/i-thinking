/**
 * 搜索关键词 / 建议 URL 解析
 */
import { ENGINE } from '@/constants/engine'
import { ENGINE_UI } from '@/views/overview/engine/engine-constants'

function parseSuggestionLabel(q: string) {
  return q.replace(ENGINE_UI.PRIVATE_USE_CHARS, '')
}

function isUrlKeyword(value: string) {
  const text = value.trim()
  if (!text || /\s/.test(text)) return false
  return ENGINE_UI.URL_PATTERN.test(text)
}

function parseKeywordUrl(value: string) {
  const text = value.trim()
  if (/^https?:\/\//i.test(text)) return text
  return `https://${text}`
}

function buildSuggestionUrl(u: string) {
  return `${ENGINE.ORIGIN.value}/${u}`
}

function buildMatchUrl(keyword: string) {
  return `${ENGINE.ORIGIN.value}/search?q=${encodeURIComponent(keyword)}`
}

function findDefaultNavigation(value: string) {
  return isUrlKeyword(value) ? ENGINE_UI.NONE : 0
}

export {
  parseSuggestionLabel,
  isUrlKeyword,
  parseKeywordUrl,
  buildSuggestionUrl,
  buildMatchUrl,
  findDefaultNavigation
}
