import Konva from 'konva'
import type { Filter } from 'konva/lib/Node'
import { useEffect, useRef, useState } from 'react'
import {
  Arrow,
  Circle,
  Ellipse,
  Group,
  Shape as KonvaShape,
  Line,
  Rect,
  Image as ReImage,
  Text
} from 'react-konva'
import { Html } from 'react-konva-utils'

export type ShapeEnum =
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

export interface Point {
  x: number
  y: number
}

export interface ShapeProps {
  id: string
  type: ShapeEnum
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
  /** 马赛克 / 模糊所需的底图：用于在指定区域采样并应用滤镜 */
  sourceImage?: HTMLImageElement
}

/** 形状渲染所需的交互回调（由父级 Annotation 注入） */
export interface ShapeInteractiveProps {
  /** 可点击/可拖拽（处于 editing 阶段时为 true） */
  interactive?: boolean
  /** 是否当前选中（仅作语义提示，Transformer 由上层依据 id 挂载） */
  isSelected?: boolean
  /** 点击形状时回调 */
  onSelect?: (id: string) => void
  /** 拖拽 / Transform 结束后回写新的几何信息 */
  onChange?: (next: ShapeProps) => void
}

/** 马赛克像素块尺寸（px） */
const MOSAIC_PIXEL = 10
/** 序号圆圈半径 */
const INDEX_RADIUS = 14
/** 箭头箭尾基础长度 */
const ARROW_HEAD_LEN = 10
/** 箭头箭尾基础宽度 */
const ARROW_HEAD_WIDTH = 8
/** 高斯模糊半径 */
const BLUR_RADIUS = 10
/** 聚光灯遮罩颜色（半透明黑色） */
const DIM_FILL = 'rgba(0, 0, 0, 0.55)'
/** 最小命中检测宽度（px），让细线条更容易被点击/拖拽 */
const MIN_HIT_WIDTH = 15
/** 荧光笔默认颜色（仅在调色板未给出时回退） */
const HIGHLIGHT_COLOR = '#FFE600'
/** 荧光笔默认描边宽度（px） */
const HIGHLIGHT_WIDTH = 16
/** 荧光笔默认透明度（0~1） */
const HIGHLIGHT_OPACITY = 0.4

/** 归一化包围盒（左上 + 宽高） */
function findBoundingBox(a: Point, b: Point) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y)
  }
}

/** 扁平化为 Konva 需要的 [x1,y1,x2,y2,...] 序列 */
function flatten(points: Point[]): number[] {
  const result: number[] = []
  for (const p of points) result.push(p.x, p.y)
  return result
}

/** 平移所有顶点 */
function translatePoints(points: Point[], dx: number, dy: number): Point[] {
  if (dx === 0 && dy === 0) return points
  return points.map(function (p) {
    return { x: p.x + dx, y: p.y + dy }
  })
}

/** 对所有顶点应用 Group 变换（先缩放再平移） */
function transformPoints(points: Point[], dx: number, dy: number, sx: number, sy: number): Point[] {
  return points.map(function (p) {
    return { x: dx + p.x * sx, y: dy + p.y * sy }
  })
}

/**
 * 带滤镜的图像分区（马赛克 / 模糊共用）。
 *
 * 关键点：
 * 1. `crop` 必须使用**底图的自然像素坐标**，而 `x/y/width/height` 仍是 Stage CSS 坐标。
 *    高 DPI 截图（如 3840×2160 截图渲染到 1920×1080 窗口）下，若直接用 CSS 坐标，
 *    会从底图左上角抠出错位的小块——这是 mosaic/blur「显示了奇怪区域」的根因。
 * 2. `cache()` 较昂贵；草稿拖拽时每帧调用会卡。这里用 rAF 把同一帧内的多次 trigger
 *    合并为一次 cache，draft 阶段也能丝滑预览。
 */
function FilteredImage(props: {
  image: HTMLImageElement
  box: { x: number; y: number; width: number; height: number }
  filters: Filter[]
  pixelSize?: number
  blurRadius?: number
}) {
  const { image, box, filters, pixelSize, blurRadius } = props
  const ref = useRef<Konva.Image>(null)
  const rafIdRef = useRef<number | null>(null)

  // 底图自然像素 / 当前视口 CSS 像素 的比例（即 DPR 等效系数）
  const sx = image.naturalWidth > 0 ? image.naturalWidth / window.innerWidth : 1
  const sy = image.naturalHeight > 0 ? image.naturalHeight / window.innerHeight : 1
  const cropRect = {
    x: box.x * sx,
    y: box.y * sy,
    width: box.width * sx,
    height: box.height * sy
  }

  useEffect(
    function () {
      const node = ref.current
      if (!node || box.width <= 0 || box.height <= 0) return
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = requestAnimationFrame(function () {
        rafIdRef.current = null
        node.clearCache()
        node.cache()
        node.getLayer()?.batchDraw()
      })
      return function () {
        if (rafIdRef.current != null) {
          cancelAnimationFrame(rafIdRef.current)
          rafIdRef.current = null
        }
      }
    },
    [image, box.x, box.y, box.width, box.height, pixelSize, blurRadius, filters]
  )

  if (box.width <= 0 || box.height <= 0) return null

  return (
    <ReImage
      ref={ref}
      image={image}
      x={box.x}
      y={box.y}
      width={box.width}
      height={box.height}
      crop={cropRect}
      filters={filters}
      pixelSize={pixelSize}
      blurRadius={blurRadius}
    />
  )
}

const shapes: Record<ShapeEnum, React.FC<ShapeProps>> = {
  arrow(props) {
    const { points, color, thickness } = props
    if (points.length < 2) return null
    const [from, to] = points
    return (
      <Arrow
        points={[from.x, from.y, to.x, to.y]}
        stroke={color}
        strokeWidth={thickness}
        fill={color}
        pointerLength={ARROW_HEAD_LEN + thickness * 2}
        pointerWidth={ARROW_HEAD_WIDTH + thickness * 1.5}
        lineCap="round"
        lineJoin="round"
        strokeScaleEnabled={false}
        hitStrokeWidth={Math.max(thickness, MIN_HIT_WIDTH)}
      />
    )
  },

  blur(props) {
    const { points, sourceImage } = props
    if (points.length < 2 || !sourceImage) return null
    const box = findBoundingBox(points[0], points[1])
    return (
      <FilteredImage
        image={sourceImage}
        box={box}
        filters={[Konva.Filters.Blur]}
        blurRadius={BLUR_RADIUS}
      />
    )
  },

  ellipse(props) {
    const { points, color, thickness, filled, opacity } = props
    if (points.length < 2) return null
    const [a, b] = points
    return (
      <Ellipse
        x={(a.x + b.x) / 2}
        y={(a.y + b.y) / 2}
        radiusX={Math.abs(b.x - a.x) / 2}
        radiusY={Math.abs(b.y - a.y) / 2}
        stroke={color}
        strokeWidth={thickness}
        fill={filled ? color : undefined}
        opacity={opacity}
        strokeScaleEnabled={false}
        hitStrokeWidth={Math.max(thickness, MIN_HIT_WIDTH)}
      />
    )
  },

  freehand(props) {
    const { points, color, thickness } = props
    if (points.length < 2) return null
    return (
      <Line
        points={flatten(points)}
        stroke={color}
        strokeWidth={thickness}
        tension={0}
        lineCap="round"
        lineJoin="round"
        strokeScaleEnabled={false}
        hitStrokeWidth={Math.max(thickness, MIN_HIT_WIDTH)}
      />
    )
  },

  /**
   * 荧光笔：多点折线 + `multiply` 混合模式。
   * - 用混合模式而非简单半透明，避免多笔交叠越来越浊（snipaste/pixpin 同款手感）。
   * - 颜色跟随工具栏调色板（`color`）；`thickness` / `opacity` 也走工具栏。
   */
  highlight(props) {
    const { points, color, thickness, opacity } = props
    if (points.length < 2) return null
    return (
      <Line
        points={flatten(points)}
        stroke={color || HIGHLIGHT_COLOR}
        strokeWidth={thickness || HIGHLIGHT_WIDTH}
        opacity={opacity ?? HIGHLIGHT_OPACITY}
        globalCompositeOperation="multiply"
        tension={0}
        lineCap="butt"
        lineJoin="round"
        strokeScaleEnabled={false}
        hitStrokeWidth={Math.max(thickness || HIGHLIGHT_WIDTH, MIN_HIT_WIDTH)}
      />
    )
  },

  spotlight(props) {
    const { points, color } = props
    if (points.length < 2) return null
    const box = findBoundingBox(points[0], points[1])
    // 「聚光灯」的外层暗罩由 Annotation 层统一渲染（避免多个聚光灯叠加变得过暗），
    // 这里只负责高亮区域的命中检测 + 视觉描边。
    return (
      <>
        <Rect
          {...box}
          stroke={color || '#FFD24D'}
          strokeWidth={1}
          dash={[4, 4]}
          fill="rgba(0,0,0,0.001)"
          listening={true}
        />
      </>
    )
  },

  index(props) {
    const { index, points, color } = props
    if (points.length < 1) return null
    const [point] = points
    return (
      <Group
        x={point.x}
        y={point.y}>
        <Circle
          radius={INDEX_RADIUS}
          fill={color}
        />
        <Text
          text={String(index ?? 1)}
          fontSize={14}
          fontFamily="sans-serif"
          fontStyle="bold"
          fill="#FFFFFF"
          align="center"
          verticalAlign="middle"
          width={INDEX_RADIUS * 2}
          height={INDEX_RADIUS * 2}
          offsetX={INDEX_RADIUS}
          offsetY={INDEX_RADIUS}
        />
      </Group>
    )
  },

  line(props) {
    const { points, color, thickness } = props
    if (points.length < 2) return null
    const [a, b] = points
    return (
      <Line
        points={[a.x, a.y, b.x, b.y]}
        stroke={color}
        strokeWidth={thickness}
        lineCap="round"
        strokeScaleEnabled={false}
        hitStrokeWidth={Math.max(thickness, MIN_HIT_WIDTH)}
      />
    )
  },

  mosaic(props) {
    const { points, sourceImage } = props
    if (points.length < 2 || !sourceImage) return null
    const box = findBoundingBox(points[0], points[1])
    return (
      <FilteredImage
        image={sourceImage}
        box={box}
        filters={[Konva.Filters.Pixelate]}
        pixelSize={Math.max(2, MOSAIC_PIXEL)}
      />
    )
  },

  rect(props) {
    const { points, color, thickness, filled, opacity } = props
    if (points.length < 2) return null
    const box = findBoundingBox(points[0], points[1])
    return (
      <Rect
        {...box}
        stroke={color}
        strokeWidth={thickness}
        fill={filled ? color : undefined}
        opacity={opacity}
        strokeScaleEnabled={false}
        hitStrokeWidth={Math.max(thickness, MIN_HIT_WIDTH)}
      />
    )
  },

  text(props) {
    const { points, color, fontSize, text, width, opacity } = props
    if (points.length < 1) return null
    const [point] = points
    return (
      <Text
        x={point.x}
        y={point.y}
        text={text || ' '}
        fontSize={fontSize ?? 16}
        fontFamily="sans-serif"
        fill={color}
        width={width}
        opacity={opacity}
      />
    )
  }
}

/**
 * 形状分发组件：根据 `type` 渲染对应 Konva 图元。
 * - 外层 `<Group>` 统一承担 `id` / 拖拽 / 点击选中 / Transform 回写，
 *   让所有形状受同一套交互/状态机控制。
 * - 内层渲染器只负责绘制，不再持有任何 `draggable` 状态。
 */
export default function Shape(props: ShapeProps & ShapeInteractiveProps) {
  const { interactive, onSelect, onChange, isSelected: _isSelected, ...shapeProps } = props
  const [editing, setEditing] = useState(false)
  const autoEditedRef = useRef(false)

  // 新建的空 text 标注：挂载后立即进入编辑态
  useEffect(function () {
    if (autoEditedRef.current) return
    autoEditedRef.current = true
    if (shapeProps.type === 'text' && !shapeProps.text) {
      setEditing(true)
    }
  }, [])

  const Renderer = shapes[shapeProps.type]
  if (!Renderer) return null
  const isText = shapeProps.type === 'text'

  function handleSelect() {
    onSelect?.(shapeProps.id)
  }

  function handleDblClick() {
    if (isText) setEditing(true)
  }

  function commitText(value: string) {
    setEditing(false)
    if (value === (shapeProps.text ?? '')) return
    onChange?.({ ...shapeProps, text: value })
  }

  function handleDragEnd(event: Konva.KonvaEventObject<DragEvent>) {
    const node = event.target
    const dx = node.x()
    const dy = node.y()
    node.position({ x: 0, y: 0 })
    if (dx === 0 && dy === 0) return
    onChange?.({ ...shapeProps, points: translatePoints(shapeProps.points, dx, dy) })
  }

  function handleTransformEnd(event: Konva.KonvaEventObject<Event>) {
    const node = event.target
    const sx = node.scaleX()
    const sy = node.scaleY()
    const dx = node.x()
    const dy = node.y()
    node.scale({ x: 1, y: 1 })
    node.position({ x: 0, y: 0 })
    if (sx === 1 && sy === 1 && dx === 0 && dy === 0) return
    const nextPoints = transformPoints(shapeProps.points, dx, dy, sx, sy)
    const next: ShapeProps = { ...shapeProps, points: nextPoints }
    // 描边粗细 / 字号随缩放等比放大，保持视觉一致
    const avg = (Math.abs(sx) + Math.abs(sy)) / 2
    if (shapeProps.thickness != null && (sx !== 1 || sy !== 1)) {
      next.thickness = Math.max(1, shapeProps.thickness * avg)
    }
    if (shapeProps.fontSize != null && (sx !== 1 || sy !== 1)) {
      next.fontSize = Math.max(8, shapeProps.fontSize * avg)
    }
    onChange?.(next)
  }

  const editPoint = shapeProps.points[0]
  const fontSize = shapeProps.fontSize ?? 16

  return (
    <Group
      id={shapeProps.id}
      name="annotation"
      draggable={interactive === true && !editing}
      listening={interactive === true}
      onClick={handleSelect}
      onTap={handleSelect}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}>
      {!editing && <Renderer {...shapeProps} />}
      {editing && isText && editPoint && (
        <Html groupProps={{ x: editPoint.x, y: editPoint.y }}>
          <textarea
            autoFocus
            defaultValue={shapeProps.text ?? ''}
            onBlur={function (e) {
              commitText(e.target.value)
            }}
            onKeyDown={function (e) {
              if (e.key === 'Escape') {
                e.preventDefault()
                commitText(shapeProps.text ?? '')
              } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                commitText((e.target as HTMLTextAreaElement).value)
              }
            }}
            style={{
              margin: 0,
              padding: '2px 4px',
              minWidth: 80,
              minHeight: fontSize * 1.4,
              fontSize: fontSize,
              lineHeight: 1.2,
              fontFamily: 'sans-serif',
              color: shapeProps.color,
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px dashed #4080ff',
              outline: 'none',
              resize: 'both',
              boxSizing: 'border-box'
            }}
          />
        </Html>
      )}
    </Group>
  )
}

export { findBoundingBox, shapes }

/**
 * 聚光灯共享暗罩。
 *
 * 关键实现细节：
 * - 一条 `Konva.Shape` 用 `sceneFunc` 绘制；外层是覆盖整个 Stage 的大矩形，
 *   每个 spotlight 用 `ctx.rect()` 追加一个**独立子路径**。
 * - 配合 `fillRule="evenodd"`，相邻子路径的奇偶层级正好把高亮区域镂空，
 *   且**不会**像单条 `Line + closed` 那样把每个矩形末尾连接到下一个起点
 *   而产生三角形伪影。
 * - `listening={false}`，命中检测由各 spotlight 自身的命中 Rect 负责。
 */
export function SpotlightMask(props: { annotations: ShapeProps[]; width: number; height: number }) {
  const { annotations, width, height } = props
  const spotlights = annotations.filter(function (annotation) {
    return annotation.type === 'spotlight' && annotation.points.length >= 2
  })
  if (spotlights.length === 0) return null

  return (
    <KonvaShape
      listening={false}
      perfectDrawEnabled={false}
      fill={DIM_FILL}
      fillRule="evenodd"
      sceneFunc={function (context, shape) {
        context.beginPath()
        // 外层矩形：覆盖整个 Stage
        context.rect(0, 0, width, height)
        // 每个 spotlight 添加一个独立子路径（rect 在 canvas 规范里是 closed sub-path）
        for (const annotation of spotlights) {
          const box = findBoundingBox(annotation.points[0], annotation.points[1])
          if (box.width <= 0 || box.height <= 0) continue
          context.rect(box.x, box.y, box.width, box.height)
        }
        context.fillStrokeShape(shape)
      }}
    />
  )
}
