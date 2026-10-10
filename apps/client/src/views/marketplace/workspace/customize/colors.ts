import { generateDerivedShades, normalizeHex } from '@/features/capture/components/colors'

type ColorFieldName = 'color' | 'textColor'

const TEXT_COLOR = '#FFFFFF'
const TEXT_SEED = '#000000'

/** 衍生色阶里主色所在档位（4 浅 + 主色 + 4 深） */
const PRIMARY_SHADE_INDEX = 4

/** 字段色阶：文字色额外补白，保证浅底上也有可选项 */
function parseFieldShades(field: ColorFieldName, primary: string) {
  const shades = generateDerivedShades(primary)
  if (field === 'textColor') return [...new Set([TEXT_COLOR, ...shades])]
  return shades
}

function findShade(shades: string[], preferred: string) {
  const normalized = normalizeHex(preferred)
  return (
    shades.find(function (item) {
      return item === normalized
    }) ??
    shades[PRIMARY_SHADE_INDEX] ??
    shades[0] ??
    normalized
  )
}

export { TEXT_COLOR, TEXT_SEED, type ColorFieldName, findShade, parseFieldShades }
