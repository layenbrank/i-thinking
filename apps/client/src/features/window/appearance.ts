/**
 * 外观：明暗模式 + 主色 + 圆角。
 *
 * 设计 token 只认根节点上的 `.dark` 与 `--primary` / `--radius` 两个 CSS 变量，
 * 这里负责读写、持久化（localStorage，启动同步可读，避免首屏闪主题）并套到根节点上。
 */

const APPEARANCE_KEY = 'client.appearance'

const APPEARANCE_MODES = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' }
] as const

/** 主色预设：前景色与主色成对给出，避免浅色主色压深底产生对比不足 */
const PRIMARY_PRESETS = [
  { label: '品牌蓝', value: '#4080ff', foreground: '#ffffff' },
  { label: '靛青', value: '#4f46e5', foreground: '#ffffff' },
  { label: '青绿', value: '#0d9488', foreground: '#ffffff' },
  { label: '琥珀', value: '#d97706', foreground: '#ffffff' },
  { label: '玫红', value: '#e11d48', foreground: '#ffffff' },
  { label: '石墨', value: '#334155', foreground: '#ffffff' }
] as const

/** 圆角预设：设计 token 的 `--radius` 由此驱动，radius-sm…4xl 自动派生 */
const RADIUS_PRESETS = [
  { label: '直角', value: 0 },
  { label: '小', value: 6 },
  { label: '中', value: 10 },
  { label: '大', value: 14 }
] as const

const RADIUS_RANGE = {
  min: RADIUS_PRESETS[0].value,
  max: RADIUS_PRESETS[RADIUS_PRESETS.length - 1].value
} as const

type AppearanceMode = (typeof APPEARANCE_MODES)[number]['value']

interface Appearance {
  mode: AppearanceMode
  color: string
  foreground: string
  radius: number
}

const DEFAULT_APPEARANCE: Appearance = {
  mode: 'system',
  color: PRIMARY_PRESETS[0].value,
  foreground: PRIMARY_PRESETS[0].foreground,
  radius: 10
}

function parseAppearance(value: unknown): Appearance {
  if (!value || typeof value !== 'object') return DEFAULT_APPEARANCE

  const input = value as Partial<Appearance>
  const mode = APPEARANCE_MODES.some(function (item) {
    return item.value === input.mode
  })
    ? (input.mode as AppearanceMode)
    : DEFAULT_APPEARANCE.mode
  const preset = PRIMARY_PRESETS.find(function (item) {
    return item.value === input.color
  })

  return {
    mode,
    color: preset ? preset.value : DEFAULT_APPEARANCE.color,
    foreground: preset ? preset.foreground : DEFAULT_APPEARANCE.foreground,
    radius:
      typeof input.radius === 'number' && Number.isFinite(input.radius)
        ? Math.min(RADIUS_RANGE.max, Math.max(RADIUS_RANGE.min, input.radius))
        : DEFAULT_APPEARANCE.radius
  }
}

function isDarkMode(mode: AppearanceMode) {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyAppearance(appearance: Appearance) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.classList.toggle('dark', isDarkMode(appearance.mode))
  root.style.setProperty('--primary', appearance.color)
  root.style.setProperty('--primary-foreground', appearance.foreground)
  root.style.setProperty('--radius', `${appearance.radius}px`)
}

function readAppearance(): Appearance {
  if (typeof localStorage === 'undefined') return DEFAULT_APPEARANCE
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY)
    return raw ? parseAppearance(JSON.parse(raw)) : DEFAULT_APPEARANCE
  } catch (error) {
    console.warn('[appearance] 读不到外观配置', error)
    return DEFAULT_APPEARANCE
  }
}

function writeAppearance(patch: Partial<Appearance>) {
  const next = parseAppearance({ ...readAppearance(), ...patch })
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next))
  } catch (error) {
    console.warn('[appearance] 写不了外观配置', error)
  }
  watchAppearance()
  return next
}

function resetAppearance() {
  try {
    localStorage.removeItem(APPEARANCE_KEY)
  } catch (error) {
    console.warn('[appearance] 重置外观配置失败', error)
  }
  watchAppearance()
  return DEFAULT_APPEARANCE
}

let stopWatch: (() => void) | null = null

/** 启动时套一次；选了「跟随系统」就继续听系统变化 */
function watchAppearance() {
  stopWatch?.()
  stopWatch = null
  if (typeof window === 'undefined') return

  const appearance = readAppearance()
  applyAppearance(appearance)
  if (appearance.mode !== 'system') return

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  function onChange() {
    if (readAppearance().mode === 'system') applyAppearance(readAppearance())
  }
  media.addEventListener('change', onChange)
  stopWatch = function () {
    media.removeEventListener('change', onChange)
  }
}

export {
  APPEARANCE_MODES,
  DEFAULT_APPEARANCE,
  PRIMARY_PRESETS,
  RADIUS_PRESETS,
  readAppearance,
  resetAppearance,
  watchAppearance,
  writeAppearance
}
export type { Appearance, AppearanceMode }
