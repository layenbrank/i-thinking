import { generate, presetPrimaryColors } from '@ant-design/colors'
import type { ColorPickerProps } from 'antd'

type ColorPreset = NonNullable<ColorPickerProps['presets']>[number]

function normalizeHex(color: string) {
  return color.trim().toUpperCase()
}

/** 平铺色板候选色：主题主色 + antd 预设色相（去重，无分组） */
function parsePresetHues(themePrimary: string): string[] {
  return [...new Set([themePrimary, ...Object.values(presetPrimaryColors)].map(normalizeHex))]
}

/** ColorPicker 预设：单一平铺色板（无分组标题），与 customize 页的选色范式一致 */
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
 * 衍生色阶：与 customize 页范式对齐，直接复用 @ant-design/colors 的
 * generate() 官方 HSV 算法（10 档感知均匀色阶），围绕主色截取
 * 「至多 4 浅色 + 主色 + 至多 4 深色」。
 *
 * 相比手写 HSL 线性偏移的旧实现：
 * - 极端色（黑/白/极高亮度）不再整段塌缩为同一值（旧实现会产出重复值，
 *   导致 React key 冲突与多色块同时命中选中态）；
 * - 明暗档位由 antd 色彩算法保证感知均匀，与 customize 页色阶观感一致。
 */
function generateDerivedShades(hex: string): string[] {
  const seed = normalizeHex(hex)
  // 去除与主色相同的档位（主色恰为 antd 标准色时必然命中），杜绝重复值
  const ramp = generate(seed).map(normalizeHex).filter((value) => value !== seed)

  // 以亮度最接近主色的档位为分割点：左侧取浅、右侧取深，保证浅→深单调
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

export { generateDerivedShades, normalizeHex, parsePresetHues, parsePresets }
