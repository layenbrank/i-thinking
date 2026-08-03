import { generate, presetPrimaryColors } from '@ant-design/colors'
import type { ColorPickerProps } from 'antd'

type ColorPreset = NonNullable<ColorPickerProps['presets']>[number]
type ColorFieldName = 'color' | 'textColor'

/** generate() 第 6 档为主色阶 */
const GENERATE_PRIMARY_INDEX = 5
const TEXT_COLOR = '#ffffff'
const TEXT_SEED = '#000000'

function normalizeHex(color: string) {
  return color.trim().toLowerCase()
}

function parsePresets(themePrimary: string): ColorPreset[] {
  const colors = [
    ...new Set(
      [themePrimary, ...Object.values(presetPrimaryColors)].map(function (color) {
        return normalizeHex(String(color))
      })
    )
  ]

  return [
    {
      key: 'primary',
      label: null,
      defaultOpen: true,
      colors
    }
  ]
}

function parseShades(primary: string, extras: string[] = []) {
  const seed = normalizeHex(primary)
  const shades = generate(seed).map(function (color) {
    return normalizeHex(String(color))
  })
  const extraShades = extras.map(normalizeHex)
  return [...new Set([...extraShades, seed, ...shades])]
}

function parseFieldShades(field: ColorFieldName, primary: string) {
  if (field === 'textColor') {
    return parseShades(primary, [TEXT_COLOR])
  }
  return parseShades(primary)
}

function findShade(shades: string[], preferred: string) {
  const normalized = normalizeHex(preferred)
  return (
    shades.find(function (item) {
      return item === normalized
    }) ??
    shades[GENERATE_PRIMARY_INDEX] ??
    shades[0] ??
    normalized
  )
}

export {
  TEXT_COLOR,
  TEXT_SEED,
  type ColorFieldName,
  type ColorPreset,
  findShade,
  normalizeHex,
  parseFieldShades,
  parsePresets,
  parseShades
}
