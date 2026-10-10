import { generateRamp, normalizeHex, parseLightness, PRESET_PRIMARY_COLORS } from '@/utils/color'

interface ColorPreset {
  key: string
  label: string | null
  colors: string[]
}

/** 平铺色板候选色：主题主色 + 预设色相（去重，无分组） */
function parsePresetHues(themePrimary: string): string[] {
  return [...new Set([themePrimary, ...PRESET_PRIMARY_COLORS].map(normalizeHex))]
}

/** 预设色板：单一平铺色板（无分组标题），与 customize 页的选色范式一致 */
function parsePresets(themePrimary: string): ColorPreset[] {
  return [
    {
      key: 'palette',
      label: null,
      colors: parsePresetHues(themePrimary)
    }
  ]
}

/**
 * 衍生色阶：围绕主色截取「至多 4 浅色 + 主色 + 至多 4 深色」。
 *
 * 色阶来自 `@/utils/color` 的 10 档 ramp（中间档即主色），这里只做
 * 「去掉主色 → 按亮度找分割点 → 左浅右深」的挑选，保证浅→深单调、无重复值。
 */
function generateDerivedShades(hex: string): string[] {
  const seed = normalizeHex(hex)
  const ramp = generateRamp(seed).filter(function (value) {
    return value !== seed
  })

  // 以亮度最接近主色的档位为分割点：左侧取浅、右侧取深
  const seedLightness = parseLightness(seed)
  let splitIndex = 0
  let closest = Number.POSITIVE_INFINITY
  ramp.forEach(function (value, index) {
    const distance = Math.abs(parseLightness(value) - seedLightness)
    if (distance < closest) {
      closest = distance
      splitIndex = index
    }
  })

  const lights = ramp.slice(Math.max(0, splitIndex - 4), splitIndex)
  const darks = ramp.slice(splitIndex + 1, splitIndex + 5)
  // 统一大写输出：与工具栏 color.toUpperCase() 的选中态比较保持一致
  return [...lights, seed, ...darks].map(normalizeHex)
}

export { generateDerivedShades, normalizeHex, parseLightness, parsePresetHues, parsePresets }
export type { ColorPreset }
