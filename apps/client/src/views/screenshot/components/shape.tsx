import Konva from 'konva'
import type { Filter } from 'konva/lib/Node'
import { useEffect, useRef } from 'react'
import { Arrow, Circle, Ellipse, Group, Line, Rect, Image as ReImage, Text } from 'react-konva'

export type ShapeType =
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'text'
  | 'freehand'
  | 'mosaic'
  | 'index'
  | 'spotlight'
  | 'blur'

export interface Point {
  x: number
  y: number
}

export interface ShapeProps {
  id: string
  type: ShapeType
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

/** 马赛克像素块尺寸（px） */
const MOSAIC_BLOCK_SIZE = 10
/** 序号圆圈半径 */
const NUMBER_RADIUS = 14
/** 箭头箭尾基础长度 */
const ARROW_POINTER_BASE_LENGTH = 10
/** 箭头箭尾基础宽度 */
const ARROW_POINTER_BASE_WIDTH = 8
/** 高斯模糊半径 */
const BLUR_RADIUS = 10
/** 聚光灯遮罩颜色（半透明黑） */
const SPOTLIGHT_MASK_COLOR = 'rgba(0, 0, 0, 0.55)'
/** 聚光灯遮罩覆盖范围（远大于可视区，保证全屏变暗） */
const SPOTLIGHT_MASK_SIZE = 10000
/** 最小命中检测宽度（px），让细线条更容易被点击/拖拽 */
const MIN_HIT_STROKE_WIDTH = 15

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

/**
 * 带滤镜的图像分区（马赛克 / 模糊共用）。
 * 通过 crop 抠出底图对应区域，再应用 Konva 滤镜并 cache 生效。
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

  useEffect(() => {
    const node = ref.current
    if (!node || box.width <= 0 || box.height <= 0) return
    node.cache()
    node.getLayer()?.batchDraw()
  }, [image, box.x, box.y, box.width, box.height, pixelSize, blurRadius])

  if (box.width <= 0 || box.height <= 0) return null

  return (
    <ReImage
      ref={ref}
      image={image}
      x={box.x}
      y={box.y}
      width={box.width}
      height={box.height}
      crop={box}
      filters={filters}
      pixelSize={pixelSize}
      blurRadius={blurRadius}
    />
  )
}

const shapes: Record<ShapeType, React.FC<ShapeProps>> = {
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
        pointerLength={ARROW_POINTER_BASE_LENGTH + thickness * 2}
        pointerWidth={ARROW_POINTER_BASE_WIDTH + thickness * 1.5}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={Math.max(thickness, MIN_HIT_STROKE_WIDTH)}
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
        hitStrokeWidth={Math.max(thickness, MIN_HIT_STROKE_WIDTH)}
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
        tension={0.4}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={Math.max(thickness, MIN_HIT_STROKE_WIDTH)}
      />
    )
  },

  spotlight(props) {
    const { points, thickness } = props
    if (points.length < 2) return null
    const box = findBoundingBox(points[0], points[1])
    // 通过 even-odd 填充规则挖空高亮区域：外层大矩形 + 内层目标区域
    return (
      <Group listening={true}>
        <Line
          points={[
            -SPOTLIGHT_MASK_SIZE,
            -SPOTLIGHT_MASK_SIZE,
            SPOTLIGHT_MASK_SIZE,
            -SPOTLIGHT_MASK_SIZE,
            SPOTLIGHT_MASK_SIZE,
            SPOTLIGHT_MASK_SIZE,
            -SPOTLIGHT_MASK_SIZE,
            SPOTLIGHT_MASK_SIZE,
            -SPOTLIGHT_MASK_SIZE,
            -SPOTLIGHT_MASK_SIZE,
            box.x,
            box.y,
            box.x + box.width,
            box.y,
            box.x + box.width,
            box.y + box.height,
            box.x,
            box.y + box.height,
            box.x,
            box.y
          ]}
          closed
          fill={SPOTLIGHT_MASK_COLOR}
          fillRule="evenodd"
          listening={false}
        />
        {/* 透明的命中层：承载拖拽 / 选中等交互 */}
        <Rect
          {...box}
          stroke="transparent"
          strokeWidth={Math.max(thickness, 1)}
        />
      </Group>
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
          radius={NUMBER_RADIUS}
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
          width={NUMBER_RADIUS * 2}
          height={NUMBER_RADIUS * 2}
          offsetX={NUMBER_RADIUS}
          offsetY={NUMBER_RADIUS}
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
        hitStrokeWidth={Math.max(thickness, MIN_HIT_STROKE_WIDTH)}
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
        pixelSize={Math.max(2, MOSAIC_BLOCK_SIZE)}
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
        hitStrokeWidth={Math.max(thickness, MIN_HIT_STROKE_WIDTH)}
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
 * 上层可通过 `id` 关联 Transformer / 状态管理。
 */
export default function Shape(props: ShapeProps) {
  const Renderer = shapes[props.type]
  if (!Renderer) return null
  return <Renderer {...props} />
}

export { shapes }
