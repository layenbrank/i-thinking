import type { CSSProperties } from 'react'

/** 磁贴组件自身需要的尺寸/形状信息（数据另走 `MagneticTile`） */
export interface MagneticTileProps {
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
  magneticTile?: MagneticTile | null
}

/**
 * 磁贴外层内联样式：round + background（size/clip/color/image/origin/repeat/position/blendMode/attachment）。
 * 未指定颜色时落到 `--card`，否则写死白底会在暗色主题下与浅色文字互相吃掉。
 */
export function buildTileStyle(tile: MagneticTile | null | undefined): CSSProperties {
  const size = tile?.background?.size
  const clip = tile?.background?.clip
  const color = tile?.background?.color
  const image = tile?.background?.image
  const origin = tile?.background?.origin
  const repeat = tile?.background?.repeat
  const position = tile?.background?.position
  const blendMode = tile?.background?.blendMode
  const attachment = tile?.background?.attachment

  const style: CSSProperties = {
    backgroundSize: size ?? 'cover',
    backgroundColor: image ? undefined : (color ?? 'var(--card)'),
    backgroundImage: image ? `url(${image})` : undefined,
    backgroundRepeat: repeat ?? 'no-repeat',
    backgroundPosition: position ?? 'center',
    backgroundAttachment: attachment ?? 'fixed'
  }

  // 自定义属性走单独的记录，避免 CSSProperties 拒绝 `--*`
  const custom: Record<string, string> = {}
  if (tile?.round) custom['--magnetic-tile-round'] = tile.round

  if (clip) style.backgroundClip = clip
  if (origin) style.backgroundOrigin = origin
  if (blendMode) style.backgroundBlendMode = blendMode

  return { ...style, ...custom }
}
