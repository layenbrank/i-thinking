interface CaptureRegion {
  x: number
  y: number
  w: number
  h: number
}

function containsPoint(region: CaptureRegion, x: number, y: number) {
  return x >= region.x && y >= region.y && x < region.x + region.w && y < region.y + region.h
}

/** 顶层优先（枚举顺序即 z-order）：取包含光标的第一项 */
function findHoverRegion(regions: CaptureRegion[], x: number, y: number): CaptureRegion | null {
  for (const region of regions) {
    if (containsPoint(region, x, y)) return region
  }
  return null
}

export { findHoverRegion }
export type { CaptureRegion }
