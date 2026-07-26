const SIZE_PX: Record<Mirror.Size, number> = {
  mini: 60,
  small: 90,
  medium: 120,
  large: 150,
  huge: 180,
  massive: 210,
  ultra: 240
}

const LAYOUT_FALLBACK = {
  size: 'mini' as Mirror.Size,
  shape: 'rectangle' as Mirror.Shape,
  direction: 'horizontal' as Mirror.Direction
}

interface MarkerLayout {
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
}

interface MarkerBox {
  w: number
  h: number
}

function findMarkerBox(layout: Partial<MarkerLayout> = {}): MarkerBox {
  const size = layout.size ?? LAYOUT_FALLBACK.size
  const shape = layout.shape ?? LAYOUT_FALLBACK.shape
  const direction = layout.direction ?? LAYOUT_FALLBACK.direction
  const base = SIZE_PX[size] ?? SIZE_PX.mini

  if (shape === 'rectangle') {
    if (direction === 'horizontal') {
      return { w: Math.round((base * 16) / 9), h: base }
    }
    return { w: base, h: Math.round((base * 16) / 9) }
  }

  return { w: base, h: base }
}

function parseMarkerLayout(input?: Partial<MarkerLayout> | null): MarkerLayout {
  return {
    size: input?.size ?? LAYOUT_FALLBACK.size,
    shape: input?.shape ?? LAYOUT_FALLBACK.shape,
    direction: input?.direction ?? LAYOUT_FALLBACK.direction
  }
}

export { SIZE_PX, LAYOUT_FALLBACK, findMarkerBox, parseMarkerLayout }
export type { MarkerLayout, MarkerBox }
