type Capacity = MagneticTile.Size

/** 有效信息容量：基础为 size，横矩形 +1（封顶 7）。大容量应展示更多字段，而非更大字号。 */
function findCapacity(
  size: MagneticTile.Size,
  shape: MagneticTile.Shape,
  direction: MagneticTile.Direction
): Capacity {
  if (shape === 'rectangle' && direction === 'horizontal' && size < 7) {
    return (size + 1) as Capacity
  }
  return size
}

function isWide(shape: MagneticTile.Shape, direction: MagneticTile.Direction) {
  return shape === 'rectangle' && direction === 'horizontal'
}

export { findCapacity, isWide }
export type { Capacity }
