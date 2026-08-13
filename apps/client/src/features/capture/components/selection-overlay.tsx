import { Group, Layer, Rect, Shape, Text } from 'react-konva'

interface Point {
  x: number
  y: number
}
interface Size {
  w: number
  h: number
}

export type Phase = 'selecting' | 'annotating' | 'editing'

interface SelectionOverlayProps {
  selection: (Point & Size) | null
  phase: Phase
  width: number
  height: number
  onSelectionChange: (selection: Point & Size) => void
  /** 涟漪动画期间临时降低遮罩暗度（0-1），不传则使用默认值 */
  dimOpacity?: number
}

const DIM_FILL = 'rgba(0, 0, 0, 0.5)'
const BORDER_STROKE = '#4080ff'
const BORDER_WIDTH = 1.5

export default function SelectionOverlay(props: SelectionOverlayProps) {
  const { selection, phase, width, height, onSelectionChange, dimOpacity } = props
  const isSelecting = phase === 'selecting'
  const dimFill = dimOpacity !== undefined ? `rgba(0, 0, 0, ${dimOpacity})` : DIM_FILL

  if (!selection || selection.w <= 0 || selection.h <= 0) {
    if (!isSelecting) return null
    return (
      <Layer listening={false} name="selection-overlay-layer">
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={dimFill}
          listening={false}
        />
      </Layer>
    )
  }

  const { x, y, w, h } = selection

  return (
    <Layer listening={false} name="selection-overlay-layer">
      <Shape
        listening={false}
        perfectDrawEnabled={false}
        fill={dimFill}
        fillRule="evenodd"
        sceneFunc={function (context, shape) {
          context.beginPath()
          context.rect(0, 0, width, height)
          context.rect(x, y, w, h)
          context.fillStrokeShape(shape)
        }}
      />

      <Group>
        <Rect
          x={x}
          y={y}
          width={w}
          height={h}
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth={1}
          listening={false}
        />
        <Rect
          x={x}
          y={y}
          width={w}
          height={h}
          stroke={BORDER_STROKE}
          strokeWidth={BORDER_WIDTH}
          shadowColor="rgba(64, 128, 255, 0.35)"
          shadowBlur={12}
          shadowOpacity={1}
          listening={!isSelecting}
          draggable={!isSelecting}
          dragBoundFunc={function (pos) {
            return {
              x: Math.max(0, Math.min(pos.x, width - w)),
              y: Math.max(0, Math.min(pos.y, height - h))
            }
          }}
          onDragEnd={function (e) {
            const newPos = e.target.position()
            onSelectionChange({ x: newPos.x, y: newPos.y, w, h })
          }}
          cursor={!isSelecting ? 'move' : 'default'}
        />
      </Group>

      <Group x={x} y={y >= 24 ? y - 22 : y + 4} listening={false}>
        <Rect
          width={String(`${Math.round(w)} \u00d7 ${Math.round(h)}`).length * 8 + 12}
          height={20}
          fill="rgba(0, 0, 0, 0.72)"
          cornerRadius={3}
        />
        <Text
          x={6}
          y={3}
          text={`${Math.round(w)} \u00d7 ${Math.round(h)}`}
          fontSize={12}
          fontFamily="ui-monospace, monospace"
          fill="#ffffff"
        />
      </Group>
    </Layer>
  )
}
