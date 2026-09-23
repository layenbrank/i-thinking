import { clsx, type ClassValue } from 'clsx'

type MarkerStyles = Record<string, string>
/** 有效信息容量档位：size 1-4，横矩形 +1（封顶 5）；未来 size 扩到 7 时同步上探 */
type Capacity = 1 | 2 | 3 | 4 | 5

function markerClass(
  styles: MarkerStyles,
  size: MagneticTile.Size,
  shape: MagneticTile.Shape,
  direction: MagneticTile.Direction,
  ...extra: ClassValue[]
) {
  return clsx(styles.marker, styles[`lv${size}`], styles[shape], styles[direction], ...extra)
}

/** 有效信息容量：基础为 size，横矩形 +1。大容量应展示更多字段，而非更大字号。 */
function findCapacity(
  size: MagneticTile.Size,
  shape: MagneticTile.Shape,
  direction: MagneticTile.Direction
): Capacity {
  if (shape === 'rectangle' && direction === 'horizontal') {
    return (size + 1) as Capacity
  }
  return size
}

function isWide(shape: MagneticTile.Shape, direction: MagneticTile.Direction) {
  return shape === 'rectangle' && direction === 'horizontal'
}

export { findCapacity, isWide, markerClass }
export type { Capacity }
