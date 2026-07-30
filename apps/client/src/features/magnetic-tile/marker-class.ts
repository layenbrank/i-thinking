import { clsx, type ClassValue } from 'clsx'

type MarkerStyles = Record<string, string>

function markerClass(
  styles: MarkerStyles,
  size: MagneticTile.Size,
  shape: MagneticTile.Shape,
  direction: MagneticTile.Direction,
  ...extra: ClassValue[]
) {
  return clsx(styles.marker, styles[`lv${size}`], styles[shape], styles[direction], ...extra)
}

export { markerClass }
