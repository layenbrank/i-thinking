/**
 * 明暗模式。设计 token 只认根节点上的 `.dark`，这里负责读写和套上。
 */

const APPEARANCE_KEY = 'studio.appearance'

const APPEARANCE_MODES = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' }
] as const

type AppearanceMode = (typeof APPEARANCE_MODES)[number]['value']

function parseAppearance(value: string | null): AppearanceMode {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}

function isDarkMode(mode: AppearanceMode) {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyAppearance(mode: AppearanceMode) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', isDarkMode(mode))
}

function readAppearance(): AppearanceMode {
  if (typeof localStorage === 'undefined') return 'system'
  try {
    return parseAppearance(localStorage.getItem(APPEARANCE_KEY))
  } catch (error) {
    console.warn('[appearance] 读不到明暗模式', error)
    return 'system'
  }
}

function writeAppearance(mode: AppearanceMode) {
  try {
    localStorage.setItem(APPEARANCE_KEY, mode)
  } catch (error) {
    console.warn('[appearance] 写不了明暗模式', error)
  }
  watchAppearance()
}

let stopWatch: (() => void) | null = null

/** 启动时套一次；选了「跟随系统」就继续听系统变化 */
function watchAppearance() {
  stopWatch?.()
  stopWatch = null
  if (typeof window === 'undefined') return

  const mode = readAppearance()
  applyAppearance(mode)
  if (mode !== 'system') return

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  function onChange() {
    if (readAppearance() === 'system') applyAppearance('system')
  }
  media.addEventListener('change', onChange)
  stopWatch = function () {
    media.removeEventListener('change', onChange)
  }
}

export { APPEARANCE_MODES, readAppearance, watchAppearance, writeAppearance }
export type { AppearanceMode }
