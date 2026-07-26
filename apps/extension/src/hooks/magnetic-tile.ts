import type { CSSProperties } from 'vue'

function useMagneticTile(magneticTile: MagneticTile) {
  const style = computed(function (): CSSProperties {
    const round = magneticTile.round
    const size = magneticTile.background?.size
    const clip = magneticTile.background?.clip
    const color = magneticTile.background?.color
    const image = magneticTile.background?.image
    const origin = magneticTile.background?.origin
    const repeat = magneticTile.background?.repeat
    const position = magneticTile.background?.position
    const blendMode = magneticTile.background?.blendMode
    const attachment = magneticTile.background?.attachment

    const backgroundImage = image ? `url(${image})` : undefined
    const backgroundColor = image ? undefined : (color ?? '#ffffff')

    const design: CSSProperties = {
      'background-size': size ?? 'cover',
      'background-color': backgroundColor,
      'background-image': backgroundImage,
      '--magnetic-tile-round': round ?? undefined,
      'background-repeat': repeat ?? 'no-repeat',
      'background-position': position ?? 'center',
      'background-attachment': attachment ?? 'fixed'
    }

    if (clip) design.backgroundClip = clip
    if (origin) design.backgroundOrigin = origin
    if (blendMode) design.backgroundBlendMode = blendMode

    return design
  })

  return { style }
}

export { useMagneticTile }
