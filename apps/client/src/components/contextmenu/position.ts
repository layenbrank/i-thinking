interface Point {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

interface Rect {
  left: number
  top: number
  width: number
  height: number
  right: number
  bottom: number
}

type Placement = 'pointer' | 'submenu'

interface OriginInput {
  anchor: Point | Rect
  size: Size
  placement: Placement
  offset?: [number, number]
  padding?: number
  containerRect?: Rect
  /** 子菜单优先方向：true 向右，false 向左 */
  preferRight?: boolean
}

interface Origin {
  left: number
  top: number
  flipX: boolean
  flipY: boolean
}

const VIEWPORT_PADDING = 8
const ROOT_OFFSET: [number, number] = [0, 4]
const SUBMENU_OFFSET: [number, number] = [4, 0]

const OFFSET_BY_PLACEMENT: Record<Placement, [number, number]> = {
  pointer: ROOT_OFFSET,
  submenu: SUBMENU_OFFSET
}

function findViewportRect(padding = VIEWPORT_PADDING): Rect {
  const width = window.innerWidth
  const height = window.innerHeight
  return {
    left: padding,
    top: padding,
    width: width - padding * 2,
    height: height - padding * 2,
    right: width - padding,
    bottom: height - padding
  }
}

function findContainerRect(container: HTMLElement, padding = VIEWPORT_PADDING): Rect {
  if (container === document.body || container === document.documentElement) {
    return findViewportRect(padding)
  }
  const box = container.getBoundingClientRect()
  return {
    left: box.left + padding,
    top: box.top + padding,
    width: box.width - padding * 2,
    height: box.height - padding * 2,
    right: box.right - padding,
    bottom: box.bottom - padding
  }
}

function clamp(value: number, min: number, max: number) {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

function parsePointerOrigin(
  point: Point,
  size: Size,
  offset: [number, number],
  container: Rect
): Origin {
  let left = point.x + offset[0]
  let top = point.y + offset[1]
  let flipX = false
  let flipY = false

  if (left + size.width > container.right) {
    left = point.x - size.width - offset[0]
    flipX = true
  }
  if (top + size.height > container.bottom) {
    top = point.y - size.height - offset[1]
    flipY = true
  }

  return { left, top, flipX, flipY }
}

function parseSubmenuOrigin(
  anchor: Rect,
  size: Size,
  offset: [number, number],
  container: Rect,
  preferRight: boolean
): Origin {
  const rightLeft = anchor.right + offset[0]
  const leftLeft = anchor.left - size.width - offset[0]
  let left = 0
  let flipX = false

  if (preferRight) {
    if (rightLeft + size.width <= container.right) {
      left = rightLeft
      flipX = false
    } else if (leftLeft >= container.left) {
      left = leftLeft
      flipX = true
    } else {
      const spaceRight = container.right - anchor.right
      const spaceLeft = anchor.left - container.left
      if (spaceRight >= spaceLeft) {
        left = rightLeft
        flipX = false
      } else {
        left = leftLeft
        flipX = true
      }
    }
  } else if (leftLeft >= container.left) {
    left = leftLeft
    flipX = true
  } else {
    left = rightLeft
    flipX = false
  }

  let top = anchor.top + offset[1]
  let flipY = false
  if (top + size.height > container.bottom) {
    top = anchor.bottom - size.height - offset[1]
    flipY = true
  }

  return { left, top, flipX, flipY }
}

function parseOrigin(input: OriginInput): Origin {
  const padding = input.padding ?? VIEWPORT_PADDING
  const container = input.containerRect ?? findViewportRect(padding)
  const offset = input.offset ?? OFFSET_BY_PLACEMENT[input.placement]
  const preferRight = input.preferRight ?? true
  const { size } = input

  const raw =
    input.placement === 'pointer'
      ? parsePointerOrigin(input.anchor as Point, size, offset, container)
      : parseSubmenuOrigin(input.anchor as Rect, size, offset, container, preferRight)

  return {
    left: clamp(raw.left, container.left, container.right - size.width),
    top: clamp(raw.top, container.top, container.bottom - size.height),
    flipX: raw.flipX,
    flipY: raw.flipY
  }
}

export type { Point, Size, Rect, Placement, OriginInput, Origin }
export {
  VIEWPORT_PADDING,
  ROOT_OFFSET,
  SUBMENU_OFFSET,
  OFFSET_BY_PLACEMENT,
  findViewportRect,
  findContainerRect,
  parseOrigin
}
