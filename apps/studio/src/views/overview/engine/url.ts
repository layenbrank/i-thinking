import { ENGINE_UI, type SearchEngine } from '@/views/overview/engine/constants'

interface SuggestionItem {
  q: string
  u: string
}

function parseSuggestionLabel(label: string) {
  return label.replace(ENGINE_UI.PRIVATE_USE_CHARS, '')
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

function buildSuggestionUrl(origin: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path
  const base = origin.replace(/\/$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}`
}

function buildMatchUrl(match: string, keyword: string) {
  return `${match}${encodeURIComponent(keyword)}`
}

function findItemUrl(engine: SearchEngine, item: SuggestionItem) {
  if (engine.key === 'bing') return buildSuggestionUrl(engine.origin, item.u)
  return buildMatchUrl(engine.match, parseSuggestionLabel(item.q))
}

function findDefaultNavigation(value: string) {
  return isUrlKeyword(value) ? ENGINE_UI.NONE : 0
}

export {
  buildMatchUrl,
  buildSuggestionUrl,
  findDefaultNavigation,
  findItemUrl,
  isUrlKeyword,
  parseKeywordUrl,
  parseSuggestionLabel
}
