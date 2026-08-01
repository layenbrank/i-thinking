import type { CSSProperties } from 'react'

interface SurfaceStyleInput {
  round?: string | null
  background?: MagneticTile.Background | null
  backdrop?: MagneticTile.Backdrop | null
  textColor?: string | null
}

function parseBackdropFilter(backdrop: MagneticTile.Backdrop | null | undefined) {
  if (!backdrop) return undefined

  const parts: string[] = []
  if (backdrop.blur) parts.push(`blur(${backdrop.blur})`)
  if (backdrop.brightness) parts.push(`brightness(${backdrop.brightness})`)
  if (backdrop.contrast) parts.push(`contrast(${backdrop.contrast})`)
  if (backdrop.grayscale) parts.push(`grayscale(${backdrop.grayscale})`)
  if (backdrop.hueRotate) parts.push(`hue-rotate(${backdrop.hueRotate})`)
  if (backdrop.opacity) parts.push(`opacity(${backdrop.opacity})`)
  if (backdrop.saturate) parts.push(`saturate(${backdrop.saturate})`)
  if (backdrop.sepia) parts.push(`sepia(${backdrop.sepia})`)
  if (backdrop.dropShadow) parts.push(`drop-shadow(${backdrop.dropShadow})`)

  if (parts.length === 0) return undefined
  return parts.join(' ')
}

/**
 * 将磁贴 round / background / backdrop / textColor 组装为内层 surface 内联样式。
 * 主窗 MagneticTile.Section 与浮层 Overlay Tile 共用。
 */
function buildSurfaceStyle(input: SurfaceStyleInput = {}): CSSProperties {
  const round = input.round
  const size = input.background?.size
  const clip = input.background?.clip
  const color = input.background?.color
  const image = input.background?.image
  const origin = input.background?.origin
  const repeat = input.background?.repeat
  const position = input.background?.position
  const blendMode = input.background?.blendMode
  const attachment = input.background?.attachment
  const backdropFilter = parseBackdropFilter(input.backdrop)

  const backgroundImage = image ? `url(${image})` : undefined
  const backgroundColor = image ? undefined : (color ?? '#ffffff')

  const style: CSSProperties = {
    backgroundSize: size ?? 'cover',
    backgroundColor,
    backgroundImage,
    '--magnetic-tile-round': round ?? '12px',
    backgroundRepeat: repeat ?? 'no-repeat',
    backgroundPosition: position ?? 'center',
    backgroundAttachment: attachment ?? 'scroll'
  }

  if (clip) style.backgroundClip = clip
  if (origin) style.backgroundOrigin = origin
  if (blendMode) style.backgroundBlendMode = blendMode
  if (input.textColor) style.color = input.textColor
  if (backdropFilter) {
    style.backdropFilter = backdropFilter
    style.WebkitBackdropFilter = backdropFilter
  }

  return style
}

export { buildSurfaceStyle }
export type { SurfaceStyleInput }
