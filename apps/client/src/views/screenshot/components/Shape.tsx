import Konva from 'konva'
import type { ReactElement } from 'react'
import { Arrow, Circle, Ellipse, Group, Image, Line, Rect, Text } from 'react-konva'

export type ShapeType =
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'text'
  | 'freehand'
  | 'mosaic'
  | 'index'
  | 'highlight'
  | 'blur'

export interface Point {
  x: number
  y: number
}

interface ShapeProps {
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
  /** 是否填充（如荧光笔） */
  filled?: boolean
  /** 透明度（0~1，荧光笔用） */
  opacity?: number
}

const MOSAIC_BLOCK_SIZE = 10
const NUMBER_RADIUS = 14
const ARROW_POINTER_BASE_LENGTH = 10
const ARROW_POINTER_BASE_WIDTH = 8
const BLUR_RADIUS = 8
/** 最小命中检测宽度（px），让细线条更容易被点击/拖拽 */
const MIN_HIT_STROKE_WIDTH = 15

const shapes: Record<ShapeType, React.FC<ShapeProps>> = {
  arrow(props: ShapeProps) {
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
  blur(props: ShapeProps) {},
  ellipse(props: ShapeProps) {
    const { points, color, thickness } = props
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
        hitStrokeWidth={Math.max(thickness, MIN_HIT_STROKE_WIDTH)}
      />
    )
  },
  freehand(props: ShapeProps) {},
  highlight(props: ShapeProps) {},
  index(props: ShapeProps) {
    const { index, points, color } = props

    return (
      <Group
        x={points[0].x}
        y={points[0].y}>
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
  line(props: ShapeProps) {
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
  mosaic(props: ShapeProps) {},
  rect(props: ShapeProps) {
    const { points, color, thickness } = props
    if (points.length < 2) return null
    const [a, b] = points
    return (
      <Rect
        x={Math.min(a.x, b.x)}
        y={Math.min(a.y, b.y)}
        width={Math.abs(b.x - a.x)}
        height={Math.abs(b.y - a.y)}
        stroke={color}
        strokeWidth={thickness}
        hitStrokeWidth={Math.max(thickness, MIN_HIT_STROKE_WIDTH)}
      />
    )
  },
  text(props: ShapeProps) {
    const { points, color, fontSize, text, width } = props
    return (
      <Text
        x={points[0].x}
        y={points[0].y}
        text={text || ' '}
        fontSize={fontSize ?? 16}
        fontFamily="sans-serif"
        fill={color}
        width={width}
      />
    )
  }
}

export function Shape() {}
