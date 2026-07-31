import type { CSSProperties } from 'react'

interface SurfaceStyleInput {
  round?: string | null
  background?: MagneticTile.Background | null
}

/**
 * 将磁贴 round / background 组装为内层 surface 内联样式。
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

  return style
}

export { buildSurfaceStyle }
export type { SurfaceStyleInput }
