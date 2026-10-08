import type Konva from 'konva'

/**
 * 标注的几何与数据形状：**不含渲染**。
 *
 * 与 `graphics.tsx` 分开的原因有两个：
 * - `graphics.tsx` 导出组件，再顺带导出这些纯函数会让 React Fast Refresh 失去热边界
 *   （`react-refresh/only-export-components`）；分文件后两边各自的导出都单一。
 * - 几何运算与 Konva 渲染无关，放一起时这个文件会继续膨胀。
 *
 * 类型（`GraphicsProps` 等）也放这里：它们是这些运算的入参形状，且被 `capture.tsx` /
 * `utility.tsx` 当纯类型用 —— `graphics.tsx` 会原样再导出，外部导入路径不变。
 */

interface Point {
  x: number
  y: number
}

type GraphicsEnum =
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'text'
  | 'freehand'
  | 'mosaic'
  | 'index'
  | 'highlight'
  | 'spotlight'
  | 'blur'

interface GraphicsProps {
  id: string
  type: GraphicsEnum
  points: Point[]
  color: string
  thickness: number
  text?: string
  fontSize?: number
  /** 文字标注宽度（可通过 Transformer 调整） */
  width?: number
  /** 序号标记的数字 */
  index?: number
  /** 是否填充 */
  filled?: boolean
  /** 透明度（0~1） */
  opacity?: number
  /** 旋转角度（度），由 Transformer 写入 */
  rotation?: number
  /** 锁定后不可点选 / 拖拽（仍可右键解锁） */
  locked?: boolean
  /** 同组标注共享此 id；无则未成组 */
  groupID?: string
  /** 马赛克 / 模糊所需的底图：用于在指定区域采样并应用滤镜 */
  sourceImage?: HTMLImageElement
}

/** 轴对齐包围盒（舞台坐标） */
interface Bounds {
  x: number
  y: number
  w: number
  h: number
}

/** 序号圆圈半径（渲染与命中检测共用，故放在这里） */
const INDEX_RADIUS = 14

/** 归一化包围盒（左上 + 宽高） */
function findBounding(a: Point, b: Point) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y)
  }
}

/**
 * 把 Transformer 的 scale/位移「烤」进顶点（改大小，不保留 scale）。
 * Konva 变换顺序：Scale → Rotate → Translate；复位 scale/position 后保留 rotation，
 * 故位移需先乘 R⁻¹ 再加到缩放后的局部点上。
 */
function transformPoints(
  points: Point[],
  dx: number,
  dy: number,
  sx: number,
  sy: number,
  rotationDeg = 0
): Point[] {
  const rad = (rotationDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  // R^{-1} * (dx, dy)
  const localDx = dx * cos + dy * sin
  const localDy = -dx * sin + dy * cos
  return points.map(function (p) {
    return { x: localDx + p.x * sx, y: localDy + p.y * sy }
  })
}

/**
 * 从 Group 当前 transform 烘焙出新 props，并把节点 scale/position 复位为 1 / 0。
 * 对齐官方 Rect 示例：用几何尺寸吸收 scale，再 scaleX/Y = 1。
 *
 * 注意：只能在 transformEnd / dragEnd 调用一次，不可在 onTransform 逐帧烘焙，
 * 否则会与 Transformer 手势累加叠加，顶点被反复放大并飞出画面。
 */
function bakeTransformSize(node: Konva.Node, props: GraphicsProps): GraphicsProps | null {
  const sx = node.scaleX()
  const sy = node.scaleY()
  const dx = node.x()
  const dy = node.y()
  const rotation = node.rotation()
  const prevRotation = props.rotation ?? 0

  if (sx === 1 && sy === 1 && dx === 0 && dy === 0 && rotation === prevRotation) {
    return null
  }

  node.scale({ x: 1, y: 1 })
  node.position({ x: 0, y: 0 })

  const next: GraphicsProps = {
    ...props,
    points: transformPoints(props.points, dx, dy, sx, sy, rotation),
    rotation
  }

  if (props.type === 'text' && props.width !== null && props.width !== undefined && sx !== 1) {
    next.width = Math.max(20, props.width * Math.abs(sx))
  }

  return next
}

/** 拖拽同伴：当前选中集中除自身外的未锁定项（群组完整性依赖选中时已 expand） */
function findDragPeerIDs(
  annotation: GraphicsProps,
  list: GraphicsProps[],
  selectedIDs: string[]
): string[] {
  if (selectedIDs.length <= 1 || !selectedIDs.includes(annotation.id)) return []
  return selectedIDs.filter(function (id) {
    if (id === annotation.id) return false
    const peer = list.find(function (item) {
      return item.id === id
    })
    return peer ? !peer.locked : false
  })
}

/** 按 id 查找节点（勿用 '#id' 选择器：UUID 以数字开头时会失败） */
function findKonvaByID(stage: Konva.Stage, id: string): Konva.Node | null {
  const nodes = stage.find(function (node: Konva.Node) {
    return node.id() === id
  })
  return nodes.length > 0 ? nodes[0]! : null
}

/** 从标注几何推导 AABB（含旋转近似） */
function findGraphicsBounds(graphics: GraphicsProps): Bounds | null {
  const points = graphics.points
  if (!points.length) return null

  let x = 0
  let y = 0
  let w = 0
  let h = 0

  if (graphics.type === 'text' && points[0]) {
    x = points[0].x
    y = points[0].y
    w = Math.max(graphics.width ?? 80, 8)
    h = Math.max((graphics.fontSize ?? 16) * 1.4, 8)
  } else if (graphics.type === 'index' && points[0]) {
    x = points[0].x - INDEX_RADIUS
    y = points[0].y - INDEX_RADIUS
    w = INDEX_RADIUS * 2
    h = INDEX_RADIUS * 2
  } else {
    let minX = points[0]!.x
    let maxX = points[0]!.x
    let minY = points[0]!.y
    let maxY = points[0]!.y
    for (let i = 1; i < points.length; i += 1) {
      const p = points[i]!
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
    const pad = Math.max(2, (graphics.thickness ?? 2) / 2)
    x = minX - pad
    y = minY - pad
    w = maxX - minX + pad * 2
    h = maxY - minY + pad * 2
  }

  const rotation = graphics.rotation ?? 0
  if (!rotation) {
    return { x, y, w, h }
  }

  const cx = x + w / 2
  const cy = y + h / 2
  const rad = (rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const corners = [
    { x: x, y: y },
    { x: x + w, y: y },
    { x: x + w, y: y + h },
    { x: x, y: y + h }
  ]
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const corner of corners) {
    const dx = corner.x - cx
    const dy = corner.y - cy
    const rx = cx + dx * cos - dy * sin
    const ry = cy + dx * sin + dy * cos
    minX = Math.min(minX, rx)
    maxX = Math.max(maxX, rx)
    minY = Math.min(minY, ry)
    maxY = Math.max(maxY, ry)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function boundsContainsPoint(bounds: Bounds, px: number, py: number): boolean {
  return px >= bounds.x && px <= bounds.x + bounds.w && py >= bounds.y && py <= bounds.y + bounds.h
}

function findUnionBounds(list: Bounds[]): Bounds | null {
  if (list.length === 0) return null
  let minX = list[0]!.x
  let minY = list[0]!.y
  let maxX = list[0]!.x + list[0]!.w
  let maxY = list[0]!.y + list[0]!.h
  for (let i = 1; i < list.length; i += 1) {
    const b = list[i]!
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.w)
    maxY = Math.max(maxY, b.y + b.h)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export {
  bakeTransformSize,
  boundsContainsPoint,
  boundsIntersect,
  findBounding,
  findDragPeerIDs,
  findGraphicsBounds,
  findKonvaByID,
  findUnionBounds,
  INDEX_RADIUS,
  transformPoints
}
export type { Bounds, GraphicsEnum, GraphicsProps, Point }
