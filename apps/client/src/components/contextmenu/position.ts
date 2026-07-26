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

interface PopupOriginInput {
  anchor: Point | Rect
  panelSize: Size
  placement: Placement
  offset?: [number, number]
  padding?: number
  containerRect?: Rect
  /** 子菜单优先方向：true 向右，false 向左 */
  preferRight?: boolean
}

interface PopupOrigin {
  left: number
  top: number
  flipX: boolean
  flipY: boolean
}

const VIEWPORT_PADDING = 8
const ROOT_OFFSET: [number, number] = [0, 4]
const SUBMENU_OFFSET: [number, number] = [4, 0]

function isRect(anchor: Point | Rect): anchor is Rect {
  return 'width' in anchor && 'height' in anchor
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

function parsePopupOrigin(input: PopupOriginInput): PopupOrigin {
  const padding = input.padding ?? VIEWPORT_PADDING
  const container = input.containerRect ?? findViewportRect(padding)
  const offset = input.offset ?? (input.placement === 'submenu' ? SUBMENU_OFFSET : ROOT_OFFSET)
  const preferRight = input.preferRight ?? true
  const { panelSize } = input

  let left = 0
  let top = 0
  let flipX = false
  let flipY = false

  if (input.placement === 'pointer') {
    const point = input.anchor as Point
    left = point.x + offset[0]
    top = point.y + offset[1]

    if (left + panelSize.width > container.right) {
      left = point.x - panelSize.width - offset[0]
      flipX = true
    }
    if (top + panelSize.height > container.bottom) {
      top = point.y - panelSize.height - offset[1]
      flipY = true
    }
  } else {
    const anchor = input.anchor as Rect
    const rightLeft = anchor.right + offset[0]
    const leftLeft = anchor.left - panelSize.width - offset[0]

    if (preferRight) {
      if (rightLeft + panelSize.width <= container.right) {
        left = rightLeft
        flipX = false
      } else if (leftLeft >= container.left) {
        left = leftLeft
        flipX = true
      } else {
        // 两侧都不够：选空间更大的一侧，再 shift
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
    } else {
      if (leftLeft >= container.left) {
        left = leftLeft
        flipX = true
      } else {
        left = rightLeft
        flipX = false
      }
    }

    top = anchor.top + offset[1]
    if (top + panelSize.height > container.bottom) {
      top = anchor.bottom - panelSize.height - offset[1]
      flipY = true
    }
  }

  left = clamp(left, container.left, container.right - panelSize.width)
  top = clamp(top, container.top, container.bottom - panelSize.height)

  return { left, top, flipX, flipY }
}

export type { Point, Size, Rect, Placement, PopupOriginInput, PopupOrigin }
export {
  VIEWPORT_PADDING,
  ROOT_OFFSET,
  SUBMENU_OFFSET,
  findViewportRect,
  findContainerRect,
  parsePopupOrigin
}
