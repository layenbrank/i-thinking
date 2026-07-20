interface RGB {
  r: number
  g: number
  b: number
}

function parseRGB(hex: string): RGB | null {
  const normalized = parseHexColor(hex)
  if (!normalized) {
    return null
  }
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16)
  }
}

function parseRGBA(input: string): { rgb: RGB; alpha: number } | null {
  const match = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(input)
  if (!match) {
    return null
  }
  return {
    rgb: {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3])
    },
    alpha: Number(match[4])
  }
}

function parseColor(input: string): RGB | null {
  return parseRGB(input) ?? parseRGBA(input)?.rgb ?? null
}

function RGBToHex(rgb: RGB): string {
  function channel(value: number): string {
    return Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  }
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`
}

function mixRGB(foreground: RGB, background: RGB, alpha: number): RGB {
  const weight = 1 - alpha
  return {
    r: foreground.r * alpha + background.r * weight,
    g: foreground.g * alpha + background.g * weight,
    b: foreground.b * alpha + background.b * weight
  }
}

function parseHexColor(input: string): string | null {
  const trimmed = input.trim()
  const shortMatch = /^#([0-9A-Fa-f]{3})$/.exec(trimmed)
  if (shortMatch) {
    const [r, g, b] = shortMatch[1].split('')
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  const longMatch = /^#([0-9A-Fa-f]{6})$/.exec(trimmed)
  if (longMatch) {
    return `#${longMatch[1].toUpperCase()}`
  }
  return null
}

/** 将 #RRGGBB 转为 rgba(r, g, b, alpha) */
export function hexToRGBA(hex: string, alpha: number): string {
  const parsed = parseHexColor(hex)
  if (!parsed) {
    return `rgba(0, 0, 0, ${alpha})`
  }
  const r = Number.parseInt(parsed.slice(1, 3), 16)
  const g = Number.parseInt(parsed.slice(3, 5), 16)
  const b = Number.parseInt(parsed.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export { parseColor, parseRGB, parseRGBA, parseHexColor, type RGB }
