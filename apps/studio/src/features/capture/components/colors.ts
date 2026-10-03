import { generate, presetPrimaryColors } from '@ant-design/colors'

interface ColorPreset {
  key: string
  label: null
  defaultOpen: boolean
  colors: string[]
}

function normalizeHex(color: string) {
  return color.trim().toUpperCase()
}

/** 平铺色板候选色：主题主色 + antd 预设色相（去重，无分组） */
function parsePresetHues(themePrimary: string): string[] {
  return [...new Set([themePrimary, ...Object.values(presetPrimaryColors)].map(normalizeHex))]
}

/** 色板预设：单一平铺色板（无分组标题） */
function parsePresets(themePrimary: string): ColorPreset[] {
  return [
    {
      key: 'palette',
      label: null,
      defaultOpen: true,
      colors: parsePresetHues(themePrimary)
    }
  ]
}

/** 取 hex 的 HSL 亮度分量（仅用于色阶分割点判定） */
function parseLightness(hex: string) {
  const normalized = hex.replace('#', '')
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2
}

/**
 * 衍生色阶：复用 @ant-design/colors 的 generate()，
 * 围绕主色截取「至多 4 浅色 + 主色 + 至多 4 深色」。
 */
function generateDerivedShades(hex: string): string[] {
  const seed = normalizeHex(hex)
  const ramp = generate(seed)
    .map(normalizeHex)
    .filter(function (value) {
      return value !== seed
    })

  const lights: string[] = []
  const darks: string[] = []
  for (const value of ramp) {
    if (parseLightness(value) >= parseLightness(seed)) lights.push(value)
    else darks.push(value)
  }

  return [...lights.slice(-4), seed, ...darks.slice(0, 4)]
}

export { generateDerivedShades, parsePresetHues, parsePresets }
export type { ColorPreset }
