import type Konva from 'konva'

/** 四角 L 手柄（iOS 玻璃质感 + 直角，非圆角） */
type CornerKind = 'nw' | 'ne' | 'se' | 'sw'

/** L 臂长 */
const CORNER_ARM = 14
/** L 描边厚度 */
const CORNER_STROKE = 4.5
/**
 * Transformer 锚点命中区。
 * Konva 默认 offset = size/2，节点 position 落在角点上。
 */
const ANCHOR_SIZE = 32
/** 旋转手柄视觉直径（小于四角 L，避免抢视觉） */
const ROTATE_ANCHOR_SIZE = 12
/** 旋转手柄命中区（略大于视觉，好拖） */
const ROTATE_HIT = 18
/** 旋转手柄相对顶边的偏移 */
const ROTATE_OFFSET = 18

const GLASS_BODY = 'rgba(255, 255, 255, 0.72)'
const GLASS_EDGE = 'rgba(255, 255, 255, 0.95)'
const GLASS_SHADOW = 'rgba(0, 0, 0, 0.32)'

/** 选区 / Transformer 边框 */
const BORDER_STROKE = 'rgba(255, 255, 255, 0.85)'
const BORDER_WIDTH = 1.5

/** 边中点短条 */
const EDGE_LEN = 16
const EDGE_THICK = 4

/**
 * 直角 L 路径（原点 = 角点）。lineJoin 用 miter，不要 round。
 */
function strokeSharpCornerL(ctx: Konva.Context, corner: CornerKind, arm = CORNER_ARM) {
  ctx.beginPath()
  switch (corner) {
    case 'nw':
      ctx.moveTo(arm, 0)
      ctx.lineTo(0, 0)
      ctx.lineTo(0, arm)
      break
    case 'ne':
      ctx.moveTo(-arm, 0)
      ctx.lineTo(0, 0)
      ctx.lineTo(0, arm)
      break
    case 'se':
      ctx.moveTo(-arm, 0)
      ctx.lineTo(0, 0)
      ctx.lineTo(0, -arm)
      break
    case 'sw':
      ctx.moveTo(arm, 0)
      ctx.lineTo(0, 0)
      ctx.lineTo(0, -arm)
      break
  }
}

/** 玻璃质感直角 L：阴影 → 主体 → 亮边 */
function paintSharpGlassL(
  ctx: Konva.Context,
  corner: CornerKind,
  arm = CORNER_ARM,
  stroke = CORNER_STROKE
) {
  ctx.save()
  ctx.lineCap = 'butt'
  ctx.lineJoin = 'miter'
  ctx.miterLimit = 4

  ctx.shadowColor = GLASS_SHADOW
  ctx.shadowBlur = 5
  ctx.shadowOffsetY = 1
  ctx.strokeStyle = GLASS_BODY
  ctx.lineWidth = stroke
  strokeSharpCornerL(ctx, corner, arm)
  ctx.stroke()

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.strokeStyle = GLASS_EDGE
  ctx.lineWidth = Math.max(1, stroke * 0.3)
  strokeSharpCornerL(ctx, corner, arm)
  ctx.stroke()

  ctx.restore()
}

function parseAnchorCorner(name: string): CornerKind | null {
  if (name.includes('top-left')) return 'nw'
  if (name.includes('top-right')) return 'ne'
  if (name.includes('bottom-left')) return 'sw'
  if (name.includes('bottom-right')) return 'se'
  return null
}

function isRotateAnchor(name: string) {
  return name.includes('rotater') || name.includes('rotate')
}

/** 小圆形玻璃旋转钮 */
function paintGlassRotateKnob(ctx: Konva.Context, radius: number) {
  ctx.save()
  ctx.shadowColor = GLASS_SHADOW
  ctx.shadowBlur = 4
  ctx.shadowOffsetY = 1

  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fillStyle = GLASS_BODY
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.lineWidth = 1
  ctx.strokeStyle = GLASS_EDGE
  ctx.stroke()

  // 中心小点，暗示可旋转
  ctx.beginPath()
  ctx.arc(0, 0, Math.max(1.2, radius * 0.22), 0, Math.PI * 2)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.fill()

  ctx.restore()
}

function rotateAnchor(anchor: Konva.Rect) {
  const hit = ROTATE_HIT
  const visualR = ROTATE_ANCHOR_SIZE / 2
  anchor.width(hit)
  anchor.height(hit)
  anchor.offsetX(hit / 2)
  anchor.offsetY(hit / 2)
  anchor.listening(true)
  anchor.draggable(true)
  anchor.fillEnabled(true)
  anchor.fill('rgba(255, 255, 255, 0.01)')
  anchor.strokeEnabled(false)
  anchor.shadowEnabled(false)
  anchor.cornerRadius(hit / 2)

  anchor.sceneFunc(function (ctx) {
    ctx.save()
    ctx.translate(hit / 2, hit / 2)
    paintGlassRotateKnob(ctx, visualR)
    ctx.restore()
  })

  anchor.hitFunc(function (ctx, shape) {
    ctx.beginPath()
    ctx.arc(hit / 2, hit / 2, hit / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fillStrokeShape(shape)
  })
}

/**
 * Transformer `anchorStyleFunc`：四角直角玻璃 L，旋转为小号玻璃圆钮。
 * 须 fillEnabled，否则 hit 画布无写入、无法拖拽。
 */
function cornerAnchor(anchor: Konva.Rect) {
  const name = anchor.name()
  if (isRotateAnchor(name)) {
    rotateAnchor(anchor)
    return
  }

  const corner = parseAnchorCorner(name)
  if (!corner) return

  const size = ANCHOR_SIZE
  anchor.width(size)
  anchor.height(size)
  // 与 Transformer 内置逻辑一致：注册点在几何中心 = 选区角点
  anchor.offsetX(size / 2)
  anchor.offsetY(size / 2)
  anchor.listening(true)
  anchor.draggable(true)
  // 近乎透明填充：场景几乎看不见，但 hit 画布可拾取
  anchor.fillEnabled(true)
  anchor.fill('rgba(255, 255, 255, 0.01)')
  anchor.strokeEnabled(false)
  anchor.shadowEnabled(false)
  anchor.cornerRadius(0)

  anchor.sceneFunc(function (ctx) {
    ctx.save()
    ctx.translate(size / 2, size / 2)
    paintSharpGlassL(ctx, corner)
    ctx.restore()
  })

  anchor.hitFunc(function (ctx, shape) {
    ctx.beginPath()
    ctx.rect(0, 0, size, size)
    ctx.closePath()
    ctx.fillStrokeShape(shape)
  })
}

function findCornerOrigin(corner: CornerKind, w: number, h: number) {
  switch (corner) {
    case 'nw':
      return { x: 0, y: 0 }
    case 'ne':
      return { x: w, y: 0 }
    case 'se':
      return { x: w, y: h }
    case 'sw':
      return { x: 0, y: h }
  }
}

function findEdgeHandleBox(type: 'n' | 'e' | 's' | 'w', w: number, h: number) {
  switch (type) {
    case 'n':
      return {
        x: w / 2 - EDGE_LEN / 2,
        y: -EDGE_THICK / 2,
        width: EDGE_LEN,
        height: EDGE_THICK
      }
    case 's':
      return {
        x: w / 2 - EDGE_LEN / 2,
        y: h - EDGE_THICK / 2,
        width: EDGE_LEN,
        height: EDGE_THICK
      }
    case 'w':
      return {
        x: -EDGE_THICK / 2,
        y: h / 2 - EDGE_LEN / 2,
        width: EDGE_THICK,
        height: EDGE_LEN
      }
    case 'e':
      return {
        x: w - EDGE_THICK / 2,
        y: h / 2 - EDGE_LEN / 2,
        width: EDGE_THICK,
        height: EDGE_LEN
      }
  }
}

export {
  ANCHOR_SIZE,
  BORDER_STROKE,
  BORDER_WIDTH,
  CORNER_ARM,
  CORNER_STROKE,
  EDGE_LEN,
  EDGE_THICK,
  GLASS_BODY,
  GLASS_EDGE,
  ROTATE_OFFSET,
  findCornerOrigin,
  findEdgeHandleBox,
  paintSharpGlassL,
  cornerAnchor
}

export type { CornerKind }
