import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { Group, Layer, Rect, Shape, Text } from 'react-konva'
import type Konva from 'konva'

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
  /** 是否有标注工具处于激活状态（annotating 阶段），用于禁用透明拖拽 Rect 的事件拦截 */
  graphicsActive?: boolean
}

const DIM_FILL = 'rgba(0, 0, 0, 0.5)'
const BORDER_STROKE = '#4080ff'
const BORDER_WIDTH = 1.5
const HANDLE_SIZE = 10
const HALF = HANDLE_SIZE / 2
const MIN_SEL = 20
const HANDLE_FILL = '#FFFFFF'
const HANDLE_STROKE = '#3B82F6'
const HANDLE_STROKE_W = 1.5

type HandleType =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'

const HANDLE_CURSORS: Record<HandleType, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize'
}

/** 暴露给 annotation 组件的方法句柄 */
export interface SelectionOverlayHandle {
  /** Stage 级 mouseMove 驱动手柄拖拽（指针离开手柄热区后仍可持续跟踪） */
  handleStageMouseMove(stagePos: { x: number; y: number }): void
  /** Stage 级 mouseUp 结束手柄拖拽 */
  handleStageMouseUp(): void
}

export const SelectionOverlay = forwardRef<SelectionOverlayHandle, SelectionOverlayProps>(
  function SelectionOverlay(props, ref) {
  const { selection, phase, width, height, onSelectionChange, dimOpacity, graphicsActive } = props
  const isSelecting = phase === 'selecting'
  // annotating 阶段（标注工具激活时）透明 Rect 不应拦截事件或响应拖拽
  const rectInteractive = !isSelecting && !graphicsActive
  const dimFill = dimOpacity !== undefined ? `rgba(0, 0, 0, ${dimOpacity})` : DIM_FILL

  // ---- Handle drag state (refs to avoid stale closures) ----
  const dragHandleRef = useRef<HandleType | null>(null)
  const dragStartRef = useRef({ px: 0, py: 0, sx: 0, sy: 0, sw: 0, sh: 0 })
  const [hoveredHandle, setHoveredHandle] = useState<HandleType | null>(null)

  // ---- Border drag state (Stage-level manual tracking, bypasses React state) ----
  const borderDragRef = useRef<{ startX: number; startY: number } | null>(null)
  const borderGroupRef = useRef<Konva.Group>(null)

  useImperativeHandle(
    ref,
    function () {
      return {
        handleStageMouseMove(stagePos: { x: number; y: number }) {
          // 优先处理手柄拖拽
          const type = dragHandleRef.current
          if (type) {
            clampSelection(type, stagePos.x, stagePos.y)
            return
          }
          // 处理边框拖拽：从 Konva 节点实时读取当前位置，避免闭包陈旧值
          const drag = borderDragRef.current
          if (drag && borderGroupRef.current) {
            const group = borderGroupRef.current
            const curX = group.x()
            const curY = group.y()
            const dx = stagePos.x - drag.startX
            const dy = stagePos.y - drag.startY
            const newX = Math.max(0, Math.min(curX + dx, width - w))
            const newY = Math.max(0, Math.min(curY + dy, height - h))
            group.position({ x: newX, y: newY })
            // 更新起点，使下次 mousemove 的 delta 从当前帧起算
            drag.startX = stagePos.x
            drag.startY = stagePos.y
          }
        },
        handleStageMouseUp() {
          dragHandleRef.current = null
          const drag = borderDragRef.current
          if (drag && borderGroupRef.current) {
            const finalX = borderGroupRef.current.x()
            const finalY = borderGroupRef.current.y()
            onSelectionChange({ x: finalX, y: finalY, w, h })
          }
          borderDragRef.current = null
        }
      }
    },
    // clampSelection 读取 dragStartRef / onSelectionChange，均为 ref 或 stable callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, height]
  )

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

  // ---- Handle position helpers ----
  function getHandlePos(type: HandleType) {
    switch (type) {
      case 'nw':
        return { x: -HALF, y: -HALF }
      case 'n':
        return { x: w / 2 - HALF, y: -HALF }
      case 'ne':
        return { x: w - HALF, y: -HALF }
      case 'e':
        return { x: w - HALF, y: h / 2 - HALF }
      case 'se':
        return { x: w - HALF, y: h - HALF }
      case 's':
        return { x: w / 2 - HALF, y: h - HALF }
      case 'sw':
        return { x: -HALF, y: h - HALF }
      case 'w':
        return { x: -HALF, y: h / 2 - HALF }
    }
  }

  function clampSelection(type: HandleType, px: number, py: number) {
    const { sx, sy, sw, sh } = dragStartRef.current
    const right = sx + sw
    const bottom = sy + sh
    let nx = sx,
      ny = sy,
      nw = sw,
      nh = sh

    switch (type) {
      case 'nw':
        nx = Math.max(0, Math.min(px, right - MIN_SEL))
        ny = Math.max(0, Math.min(py, bottom - MIN_SEL))
        nw = right - nx
        nh = bottom - ny
        break
      case 'n':
        ny = Math.max(0, Math.min(py, bottom - MIN_SEL))
        nh = bottom - ny
        break
      case 'ne':
        ny = Math.max(0, Math.min(py, bottom - MIN_SEL))
        nw = Math.max(MIN_SEL, Math.min(px - sx, width - sx))
        nh = bottom - ny
        break
      case 'e':
        nw = Math.max(MIN_SEL, Math.min(px - sx, width - sx))
        break
      case 'se':
        nw = Math.max(MIN_SEL, Math.min(px - sx, width - sx))
        nh = Math.max(MIN_SEL, Math.min(py - sy, height - sy))
        break
      case 's':
        nh = Math.max(MIN_SEL, Math.min(py - sy, height - sy))
        break
      case 'sw':
        nx = Math.max(0, Math.min(px, right - MIN_SEL))
        nw = right - nx
        nh = Math.max(MIN_SEL, Math.min(py - sy, height - sy))
        break
      case 'w':
        nx = Math.max(0, Math.min(px, right - MIN_SEL))
        nw = right - nx
        break
    }

    onSelectionChange({ x: nx, y: ny, w: nw, h: nh })
  }

  // ---- Handle event factories ----
  function onHandleDown(type: HandleType, e: any) {
    e.cancelBubble = true
    const stage = e.target.getStage()
    const pt = stage?.getPointerPosition()
    if (!pt) return
    dragHandleRef.current = type
    dragStartRef.current = { px: pt.x, py: pt.y, sx: x, sy: y, sw: w, sh: h }
  }

  const HANDLE_TYPES: HandleType[] = [
    'nw',
    'n',
    'ne',
    'e',
    'se',
    's',
    'sw',
    'w'
  ]

  const borderCursor = hoveredHandle ? 'default' : 'move'

  return (
    <Layer listening={!isSelecting} name="selection-overlay-layer">
      {/* Even-odd dim mask with selection hole */}
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

      {/* 选区整体 Group — 边框拖拽时直接操作此 Group 的 position */}
      <Group ref={borderGroupRef} x={x} y={y}>
        {/* 透明热区：捕获 mousedown，不使用 draggable */}
        <Rect
          width={w}
          height={h}
          fill="transparent"
          stroke="transparent"
          strokeWidth={10}
          listening={rectInteractive}
          draggable={false}
          cursor={rectInteractive ? borderCursor : 'default'}
          onMouseDown={function (e) {
            if (!rectInteractive) return
            e.cancelBubble = true
            const stage = e.target.getStage()
            const pt = stage?.getPointerPosition()
            if (!pt) return
            borderDragRef.current = {
              startX: pt.x,
              startY: pt.y
            }
          }}
        />
        {/* 视觉边框（纯展示，不参与事件） */}
        <Rect
          width={w}
          height={h}
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth={1}
          listening={false}
        />
        <Rect
          width={w}
          height={h}
          stroke={BORDER_STROKE}
          strokeWidth={BORDER_WIDTH}
          shadowColor="rgba(64, 128, 255, 0.35)"
          shadowBlur={12}
          shadowOpacity={1}
          listening={false}
        />

        {/* Dimension label — 相对于 Group 的局部坐标 */}
        <Group y={y >= 24 ? -22 : 4} listening={false}>
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

        {/* 8 Figma-style resize handles — 相对于 Group 的局部坐标 */}
        {!isSelecting &&
          HANDLE_TYPES.map(function (type) {
            const pos = getHandlePos(type)
            return (
              <Rect
                key={type}
                x={pos.x}
                y={pos.y}
                width={HANDLE_SIZE}
                height={HANDLE_SIZE}
                cornerRadius={HANDLE_SIZE / 2}
                fill={HANDLE_FILL}
                stroke={HANDLE_STROKE}
                strokeWidth={HANDLE_STROKE_W}
                shadowColor="rgba(0, 0, 0, 0.25)"
                shadowBlur={3}
                shadowOffsetX={0}
                shadowOffsetY={1}
                cursor={HANDLE_CURSORS[type]}
                onMouseDown={function (e) {
                  onHandleDown(type, e)
                }}
                onMouseEnter={function () {
                  setHoveredHandle(type)
                }}
                onMouseLeave={function () {
                  setHoveredHandle(null)
                }}
              />
            )
          })}
      </Group>
    </Layer>
  )
  }
)

export default SelectionOverlay
