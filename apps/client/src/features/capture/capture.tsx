import { Component, type ErrorInfo, type ReactNode } from 'react'
import { clsx } from 'clsx'
import type Konva from 'konva'
import { useHotkeys } from 'react-hotkeys-hook'
import { v4 as UUID } from 'uuid'

import { Annotation, type AnnotationHandle } from '@/features/capture/components/annotation'
import { type GraphicsEnum, type GraphicsProps } from '@/features/capture/components/graphics'
import Magnifier from '@/features/capture/components/magnifier'
import { motion, useReducedMotion } from 'motion/react'
import Utility from '@/features/capture/components/utility'
import { isTauri, loadImageFromPath, takeScreenshot } from '@/features/capture/tauri'
import { pinTexture, saveToUserPath } from '@/features/capture/clipboard'

import styles from '@/features/capture/capture.module.scss'

// ============ Error Boundary ============

interface CaptureErrorBoundaryProps {
  children: ReactNode
  onError: () => void
  onClose: () => void
}
interface CaptureErrorBoundaryState {
  error: Error | null
}

class CaptureErrorBoundary extends Component<CaptureErrorBoundaryProps, CaptureErrorBoundaryState> {
  override state: CaptureErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CaptureErrorBoundary]', error, info)
    this.props.onError()
  }

  override render() {
    if (this.state.error) {
      if (import.meta.env.DEV) {
        return (
          <div className={styles.errorPanel}>
            <div className={styles.errorCard}>
              <span className={styles.errorBadge}>CAPTURE CRASH</span>
              <p className={styles.errorMessage}>{this.state.error.message}</p>
            </div>
          </div>
        )
      }
      return null
    }
    return this.props.children
  }
}

export interface CaptureProps {
  /** Rendered inside the shared overlay window. */
  embedded?: boolean
  onExit?: () => void
  onClose?: () => void
  onTexture?: (input: { src: string; w: number; h: number }) => void
}

type StageEvent = Konva.KonvaEventObject<MouseEvent>

/**
 * - `selecting`：框选阶段，鼠标拖拽生成裁剪选区。
 * - `annotating`：已选择工具，鼠标拖拽创建新标注。
 * - `editing`：无激活工具，可点击/拖拽已有标注。
 */
export type Phase = 'selecting' | 'annotating' | 'editing'

interface Point {
  x: number
  y: number
}
interface Size {
  w: number
  h: number
}

/** 创建/拖动判定为「有效」的最小像素距离，低于该值视为误操作并丢弃 */
const MIN_DRAG_PX = 3

/** 单点创建型标注（点击即可），不受拖拽阈值限制 */
const POINT_SHAPES = new Set<GraphicsEnum>(['text', 'index'])

/** 多点追加型标注（拖拽路径上不断 append 点）：画笔、荧光笔 */
const MULTI_POINT_GRAPHICS = new Set<GraphicsEnum>(['freehand', 'highlight'])

export default function Capture(props: CaptureProps = {}) {
  const { onExit, onClose, onTexture } = props
  const [phase, onUpdatePhase] = useState<Phase>('selecting')
  const [graphics, onUpdateGraphics] = useState<GraphicsEnum | null>(null)
  const [annotations, onUpdateAnnotations] = useState<GraphicsProps[]>([])
  const [selection, onUpdateSelection] = useState<(Point & Size) | null>(null)
  const [color, onUpdateColor] = useState('#4080ff')
  const [thickness, onUpdateThickness] = useState(2)
  const [filled, onUpdateFilled] = useState(false)
  const [opacity, onUpdateOpacity] = useState(1)
  const [fontSize, onUpdateFontSize] = useState(18)
  const [selectedID, onUpdateSelectedID] = useState<string | null>(null)
  const [sourceImage, onUpdateSourceImage] = useState<HTMLImageElement | null>(null)
  /** 截图加载三态：loading 黑罩、ready 可交互、error 错误卡片 */
  const [captureStatus, onUpdateCaptureStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [captureError, onUpdateCaptureError] = useState<string | null>(null)
  /** 可撤销/重做状态（从 historyRef 同步，但需要反应式驱动 UI） */
  const [canUndo, onUpdateCanUndo] = useState(false)
  const [canRedo, onUpdateCanRedo] = useState(false)

  const isReducedMotion = useReducedMotion()

  /** 当前正在拖拽创建的草稿 id（避免通过 closure 读外层 state） */
  const draftIDRef = useRef<string | null>(null)
  /** 鼠标按下时标记拖拽状态，避免闭包捕获 selection 导致判断失效 */
  const isDraggingRef = useRef(false)
  /** 标记拖拽已被取消（如 handleMove 防御触发），阻止后续 move 继续更新选区 */
  const cancelledRef = useRef(false)
  /** 标记 selecting 阶段是否已产生有效位移，避免依赖闭包中的 selection state */
  const hasMovedRef = useRef(false)
  /** 鼠标按下时的起点（仅用于阈值判定 / 选区起点） */
  const beginRef = useRef<Point>({ x: 0, y: 0 })
  /** 暴露 Annotation 的画布渲染能力 */
  const annotationRef = useRef<AnnotationHandle>(null)

  /** 历史栈：每一帧都是 annotations 的完整快照（A 方案：commit / drag-end / transform-end / delete 入栈）*/
  const historyRef = useRef<GraphicsProps[][]>([[]])
  const historyStepRef = useRef(0)

  /** 同步 canUndo / canRedo 到 React state */
  function syncHistoryFlags() {
    onUpdateCanUndo(historyStepRef.current > 0)
    onUpdateCanRedo(historyStepRef.current < historyRef.current.length - 1)
  }

  /** 把一帧 annotations 写入历史栈 */
  function commitHistory(next: GraphicsProps[]) {
    const truncated = historyRef.current.slice(0, historyStepRef.current + 1)
    truncated.push(next)
    historyRef.current = truncated
    historyStepRef.current = truncated.length - 1
    syncHistoryFlags()
  }

  function handleUndo() {
    if (historyStepRef.current === 0) return
    historyStepRef.current -= 1
    onUpdateAnnotations(historyRef.current[historyStepRef.current])
    onUpdateSelectedID(null)
    syncHistoryFlags()
  }

  function handleRedo() {
    if (historyStepRef.current >= historyRef.current.length - 1) return
    historyStepRef.current += 1
    onUpdateAnnotations(historyRef.current[historyStepRef.current])
    onUpdateSelectedID(null)
    syncHistoryFlags()
  }

  /** 删除当前选中的标注 */
  function handleDelete() {
    if (!selectedID) return
    onUpdateAnnotations(function (prev) {
      const next = prev.filter(function (a) {
        return a.id !== selectedID
      })
      commitHistory(next)
      return next
    })
    onUpdateSelectedID(null)
  }

  /** Esc 逐级退出：annotating → editing → 取消选中 → 重选 */
  function handleEscape() {
    if (phase === 'annotating') {
      onUpdateGraphics(null)
      return
    }
    if (selectedID) {
      onUpdateSelectedID(null)
      return
    }
    if (selection) {
      handleRefresh()
      return
    }
    onExit?.()
  }

  // 快捷键：撤销 / 重做 / 删除 / 退出
  useHotkeys('mod+z', function (e) {
    e.preventDefault()
    handleUndo()
  })
  useHotkeys(['mod+shift+z', 'mod+y'], function (e) {
    e.preventDefault()
    handleRedo()
  })
  useHotkeys(['delete', 'backspace'], function (e) {
    e.preventDefault()
    handleDelete()
  })
  useHotkeys('escape', function (e) {
    e.preventDefault()
    handleEscape()
  })
  useHotkeys('mod+r', function (e) {
    e.preventDefault()
    handleRefresh()
  })

  /** 加载滤镜/放大镜共用的底图：仅支持 Tauri 桌面运行时，失败时进入 error 态供重试 */
  async function loadCapture() {
    onUpdateCaptureStatus('loading')
    onUpdateCaptureError(null)
    try {
      if (!isTauri()) {
        throw new Error('截图需要 Tauri 桌面运行时')
      }
      const result = await takeScreenshot()
      const img = await loadImageFromPath(result.path)
      onUpdateSourceImage(img)
      onUpdateCaptureStatus('ready')
    } catch (err) {
      console.error('[capture] 真实截图失败', err)
      onUpdateCaptureError(String(err))
      onUpdateCaptureStatus('error')
    }
  }

  useEffect(function () {
    void loadCapture()
  }, [])

  /** 选择某个工具后，自动进入 annotating 阶段；shape 为 null 时回到 editing */
  useEffect(
    function () {
      if (graphics) {
        onUpdatePhase('annotating')
        onUpdateSelectedID(null)
      } else if (selection) {
        onUpdatePhase('editing')
      }
    },
    [graphics]
  )

  /** 从事件中取得 Stage 内的指针坐标（处理 DPR / 偏移 / 未来缩放） */
  function readPointer(event: StageEvent): Point | null {
    const stage = event.target.getStage()
    if (!stage) return null
    const pos = stage.getPointerPosition()
    if (!pos) return null
    return { x: pos.x, y: pos.y }
  }

  function handlePress(event: StageEvent) {
    const pt = readPointer(event)
    if (!pt) return

    // editing：点击空白由 Annotation 内部处理（取消选中），此处不做绘制
    if (phase === 'editing') return

    // 命中已有标注则不开始绘制，让标注自己处理 onSelect/drag
    const clickedOnEmpty = event.target === event.target.getStage()
    if (phase === 'annotating' && !clickedOnEmpty) return

    beginRef.current = pt
    isDraggingRef.current = true
    hasMovedRef.current = false

    if (phase === 'selecting') {
      onUpdateSelection({ x: pt.x, y: pt.y, w: 0, h: 0 })
      return
    }

    // 防御：本轮拖拽已被取消，不再创建新标注
    if (cancelledRef.current) return

    // 标注创建必须落在裁剪选区内：选区为空或选区外点击均忽略
    if (!selection) return
    const inBounds =
      pt.x >= selection.x &&
      pt.x <= selection.x + selection.w &&
      pt.y >= selection.y &&
      pt.y <= selection.y + selection.h
    if (!inBounds) return

    // annotating：创建一个草稿标注
    if (phase === 'annotating') {
      if (!graphics) return
      const newID = UUID()
      draftIDRef.current = newID
      // index 形状需要递增编号：基于已有 index 标注的最大值 + 1
      let nextIndex: number | undefined
      if (graphics === 'index') {
        nextIndex =
          annotations
            .filter(function (a) {
              return a.type === 'index'
            })
            .reduce(function (max, a) {
              return Math.max(max, a.index ?? 0)
            }, 0) + 1
      }
      onUpdateAnnotations(function (prev) {
        return prev.concat([
          {
            id: newID,
            type: graphics,
            color: color,
            thickness: thickness,
            fontSize: fontSize,
            filled: filled,
            opacity: opacity,
            index: nextIndex,
            points: [{ x: pt.x, y: pt.y }]
          }
        ])
      })
    }
  }

  function handleMove(event: StageEvent) {
    const pt = readPointer(event)
    if (!pt) return

    if (phase === 'selecting' && isDraggingRef.current) {
      // 防御：鼠标已松开但 release 未触发（如 Alt+Tab 切走）
      if (event.evt.buttons === 0) {
        isDraggingRef.current = false
        cancelledRef.current = true
        return
      }
      // 标记已产生有效位移，handleRelease 据此判断是否保留选区
      hasMovedRef.current = true
      // selecting 阶段实时更新选区（用 beginRef 替代 selection 避免闭包陈旧值）
      onUpdateSelection({
        x: Math.min(beginRef.current.x, pt.x),
        y: Math.min(beginRef.current.y, pt.y),
        w: Math.abs(pt.x - beginRef.current.x),
        h: Math.abs(pt.y - beginRef.current.y)
      })
      return
    }

    // 防御：本轮拖拽已被取消，不再处理后续 move
    if (cancelledRef.current) return

    if (phase === 'annotating' && draftIDRef.current) {
      // 单点型标注不需要在拖拽过程中更新多个顶点
      if (graphics && POINT_SHAPES.has(graphics)) return
      // 将拖拽点约束到裁剪选区内，防止标注超出
      const clamped = selection
        ? {
            x: Math.max(selection.x, Math.min(pt.x, selection.x + selection.w)),
            y: Math.max(selection.y, Math.min(pt.y, selection.y + selection.h))
          }
        : pt
      const draftID = draftIDRef.current
      onUpdateAnnotations(function (prev) {
        return prev.map(function (value) {
          if (value.id !== draftID) return value
          if (MULTI_POINT_GRAPHICS.has(value.type)) {
            return {
              ...value,
              points: value.points.concat([{ x: clamped.x, y: clamped.y }])
            }
          }
          return {
            ...value,
            points: [value.points[0], { x: clamped.x, y: clamped.y }]
          }
        })
      })
    }
  }

  function handleRelease(event: StageEvent) {
    const pt = readPointer(event)
    if (!pt) return

    const moved = hasMovedRef.current
    isDraggingRef.current = false
    cancelledRef.current = false
    hasMovedRef.current = false

    const dx = pt.x - beginRef.current.x
    const dy = pt.y - beginRef.current.y
    const tooSmall = Math.abs(dx) < MIN_DRAG_PX && Math.abs(dy) < MIN_DRAG_PX

    if (phase === 'selecting') {
      if (tooSmall) {
        // 误触一下：保留旧选区不重置（如果本次拖拽无有效位移则置 null）
        if (!moved) onUpdateSelection(null)
        return
      }
      // 完成选区：进入 editing，等待用户选择工具
      onUpdateSelection({
        x: Math.min(beginRef.current.x, pt.x),
        y: Math.min(beginRef.current.y, pt.y),
        w: Math.abs(dx),
        h: Math.abs(dy)
      })
      onUpdatePhase('editing')
      return
    }

    if (phase === 'annotating' && draftIDRef.current) {
      const draftID = draftIDRef.current
      draftIDRef.current = null

      // 单点型标注（text/index）跳过阈值检查；其他形状判定尺寸
      const isSinglePoint = graphics ? POINT_SHAPES.has(graphics) : false
      if (!isSinglePoint && tooSmall) {
        // 丢弃过小的草稿
        onUpdateAnnotations(function (prev) {
          return prev.filter(function (v) {
            return v.id !== draftID
          })
        })
        return
      }

      // 将释放点约束到裁剪选区内，防止标注超出
      const clamped = selection
        ? {
            x: Math.max(selection.x, Math.min(pt.x, selection.x + selection.w)),
            y: Math.max(selection.y, Math.min(pt.y, selection.y + selection.h))
          }
        : pt
      // 提交草稿到历史栈
      onUpdateAnnotations(function (prev) {
        const next = prev.map(function (value) {
          if (value.id !== draftID) return value
          if (isSinglePoint) return value
          if (MULTI_POINT_GRAPHICS.has(value.type)) {
            return {
              ...value,
              points: value.points.concat([{ x: clamped.x, y: clamped.y }])
            }
          }
          return {
            ...value,
            points: [value.points[0], { x: clamped.x, y: clamped.y }]
          }
        })
        commitHistory(next)
        return next
      })
      // 文字标注创建后直接进入编辑态（必须在 updater 外部调用，此时 state 已更新）
      if (isSinglePoint && graphics === 'text') {
        annotationRef.current?.startEditing(draftID, '')
      }
    }
  }

  /** 选中已有标注时，将该标注的属性值同步到工具栏，便于继续修改 */
  useEffect(
    function () {
      if (!selectedID) return
      const current = annotations.find(function (a) {
        return a.id === selectedID
      })
      if (!current) return
      onUpdateColor(current.color)
      onUpdateThickness(current.thickness ?? 2)
      if (current.opacity !== null && current.opacity !== undefined)
        onUpdateOpacity(current.opacity)
      if (current.filled !== null && current.filled !== undefined) onUpdateFilled(current.filled)
      if (current.fontSize !== null && current.fontSize !== undefined)
        onUpdateFontSize(current.fontSize)
    },
    [selectedID]
  )

  /** 单个标注被拖拽 / Transform 后回写并记入历史 */
  function handleAnnotationChange(next: GraphicsProps) {
    onUpdateAnnotations(function (prev) {
      const updated = prev.map(function (v) {
        return v.id === next.id ? next : v
      })
      commitHistory(updated)
      return updated
    })
  }

  /**
   * 工具栏属性变更：若已选中某个标注 → 同时回写到该标注并记入历史；
   * 否则只更新「未来新建」的默认值。
   */
  function applyPropertyToSelected(patch: Partial<GraphicsProps>) {
    if (!selectedID) return
    onUpdateAnnotations(function (prev) {
      const updated = prev.map(function (v) {
        return v.id === selectedID ? { ...v, ...patch } : v
      })
      commitHistory(updated)
      return updated
    })
  }

  function handleUpdateColor(next: string) {
    onUpdateColor(next)
    applyPropertyToSelected({ color: next })
  }
  function handleUpdateThickness(next: number) {
    onUpdateThickness(next)
    applyPropertyToSelected({ thickness: next })
  }
  function handleUpdateFilled(next: boolean) {
    onUpdateFilled(next)
    applyPropertyToSelected({ filled: next })
  }
  function handleUpdateOpacity(next: number) {
    onUpdateOpacity(next)
    applyPropertyToSelected({ opacity: next })
  }
  function handleUpdateFontSize(next: number) {
    onUpdateFontSize(next)
    applyPropertyToSelected({ fontSize: next })
  }

  /** 「重选」：重置选区、标注、历史栈，回到框选阶段 */
  function handleRefresh() {
    onUpdateSelection(null)
    onUpdateGraphics(null)
    onUpdateSelectedID(null)
    onUpdateAnnotations([])
    onUpdatePhase('selecting')
    isDraggingRef.current = false
    cancelledRef.current = false
    hasMovedRef.current = false
    historyRef.current = [[]]
    historyStepRef.current = 0
    syncHistoryFlags()
  }

  /** 取出当前 Stage 选区内渲染好的 PNG dataUrl，交给后续动作（贴图 / 保存） */
  async function withStagePng<T>(action: (dataUrl: string) => Promise<T>) {
    const dataUrl = annotationRef.current?.renderPng()
    if (!dataUrl) return
    try {
      await action(dataUrl)
    } catch (err) {
      console.error('[capture] 处理截图结果失败', err)
    }
  }

  function handlePin() {
    void withStagePng(async function (dataUrl) {
      const result = await pinTexture(dataUrl)
      onTexture?.({ src: result.filePath, w: result.w, h: result.h })
      onExit?.()
    })
  }

  /** 「保存」：弹出系统保存对话框，将裁剪+标注后的 PNG 写入用户选择的路径 */
  function handleSave() {
    void withStagePng(async function (dataUrl) {
      const path = await saveToUserPath(dataUrl)
      if (path) onExit?.()
    })
  }

  function handleClose() {
    onExit?.()
  }

  useEffect(
    function () {
      if (import.meta.env.DEV) console.log('[DEBUG] annotations', annotations)
    },
    [annotations]
  )

  return (
    <CaptureErrorBoundary
      onError={function () {
        onExit?.()
      }}
      onClose={onClose ?? function () {}}>
      <div className={clsx(styles.capture)}>
        {captureStatus === 'error' ? (
          <div className={styles.errorPanel}>
            <div className={styles.errorCard}>
              <span className={styles.errorBadge}>CAPTURE FAILED</span>
              <p className={styles.errorMessage}>{captureError ?? '截图加载失败'}</p>
              <div className={styles.errorActions}>
                <button
                  type="button"
                  className={clsx(styles.errorButton, styles.errorRetry)}
                  onClick={function () {
                    void loadCapture()
                  }}>
                  重试
                </button>
                <button
                  type="button"
                  className={clsx(styles.errorButton, styles.errorExit)}
                  onClick={function () {
                    onExit?.()
                  }}>
                  退出
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <motion.div
              key="capture-ready"
              initial={isReducedMotion ? undefined : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.3,
                ease: [0.22, 1, 0.36, 1]
              }}>
              <Annotation
                ref={annotationRef}
                onClose={onClose ?? function () {}}
                onMove={handleMove}
                clipRect={selection}
                onPress={handlePress}
                selectedID={selectedID}
                annotations={annotations}
                sourceImage={sourceImage}
                onRelease={handleRelease}
                onSelect={onUpdateSelectedID}
                interactive={true}
                onChange={handleAnnotationChange}
                onEditStart={function () {
                  onUpdateSelectedID(null)
                }}
                selection={selection}
                phase={phase}
                onSelectionChange={onUpdateSelection}
              />
            </motion.div>

            {/* 选区阶段的像素级放大镜 */}
            <Magnifier
              sourceImage={sourceImage}
              visible={phase === 'selecting'}
              onClose={onClose ?? function () {}}
            />

            <Utility
              color={color}
              filled={filled}
              canRedo={canRedo}
              canUndo={canUndo}
              active={graphics}
              opacity={opacity}
              onPin={handlePin}
              fontSize={fontSize}
              onRedo={handleRedo}
              onUndo={handleUndo}
              thickness={thickness}
              onClose={handleClose}
              onRefresh={handleRefresh}
              onSave={handleSave}
              onUpdateColor={handleUpdateColor}
              onUpdateUtility={onUpdateGraphics}
              onUpdateFilled={handleUpdateFilled}
              onUpdateOpacity={handleUpdateOpacity}
              onUpdateFontSize={handleUpdateFontSize}
              onUpdateThickness={handleUpdateThickness}
              selection={phase === 'selecting' ? null : selection}
            />
          </>
        )}
      </div>
    </CaptureErrorBoundary>
  )
}
