import { clsx } from 'clsx'
import type Konva from 'konva'
import { AnimatePresence, motion } from 'motion/react'
import { useHotkeys } from 'react-hotkeys-hook'
import { v4 as UUID } from 'uuid'

import { Annotation, type AnnotationHandle } from '@/views/screenshot/components/annotation'
import { type GraphicsEnum, type GraphicsProps } from '@/views/screenshot/components/graphics'
import Magnifier from '@/views/screenshot/components/magnifier'
import Utility from '@/views/screenshot/components/utility'
import {
  captureScreen,
  closeScreenshotWindow,
  isTauri,
  loadDataUrl,
  savePngToAppDir,
  writeImageToClipboard
} from '@/views/screenshot/tauri'

import styles from '@/views/screenshot/screenshot.module.scss'

import URLBackground from '@/assets/screenshot-background.jpg'

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

export default function Screenshot() {
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
  /** 可撤销/重做状态（从 historyRef 同步，但需要反应式驱动 UI） */
  const [canUndo, onUpdateCanUndo] = useState(false)
  const [canRedo, onUpdateCanRedo] = useState(false)

  /** 当前正在拖拽创建的草稿 id（避免通过 closure 读外层 state） */
  const draftIDRef = useRef<string | null>(null)
  /** 鼠标按下时的起点（仅用于阈值判定 / 选区起点） */
  const beginRef = useRef<Point>({ x: 0, y: 0 })
  /** 暴露 Annotation 的导出能力 */
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
    }
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

  /** 加载滤镜/放大镜共用的底图：Tauri 环境下用主显示器实时截图，浏览器开发回退到占位图 */
  useEffect(function () {
    let cancelled = false
    async function load() {
      try {
        if (isTauri()) {
          const result = await captureScreen()
          const img = await loadDataUrl(result.data_url)
          if (!cancelled) onUpdateSourceImage(img)
          return
        }
      } catch (err) {
        console.warn('[screenshot] Tauri capture 失败，回退到占位图', err)
      }
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = function () {
        if (!cancelled) onUpdateSourceImage(img)
      }
      img.src = URLBackground
    }
    load()
    return function () {
      cancelled = true
    }
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

    if (phase === 'selecting') {
      onUpdateSelection({ x: pt.x, y: pt.y, w: 0, h: 0 })
      return
    }

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

    if (phase === 'selecting' && selection) {
      // selecting 阶段实时更新选区（修复原 handleMove 为空函数的问题）
      onUpdateSelection({
        x: Math.min(beginRef.current.x, pt.x),
        y: Math.min(beginRef.current.y, pt.y),
        w: Math.abs(pt.x - beginRef.current.x),
        h: Math.abs(pt.y - beginRef.current.y)
      })
      return
    }

    if (phase === 'annotating' && draftIDRef.current) {
      // 单点型标注不需要在拖拽过程中更新多个顶点
      if (graphics && POINT_SHAPES.has(graphics)) return
      const draftID = draftIDRef.current
      onUpdateAnnotations(function (prev) {
        return prev.map(function (value) {
          if (value.id !== draftID) return value
          if (MULTI_POINT_GRAPHICS.has(value.type)) {
            return {
              ...value,
              points: value.points.concat([{ x: pt.x, y: pt.y }])
            }
          }
          return {
            ...value,
            points: [value.points[0], { x: pt.x, y: pt.y }]
          }
        })
      })
    }
  }

  function handleRelease(event: StageEvent) {
    const pt = readPointer(event)
    if (!pt) return

    const dx = pt.x - beginRef.current.x
    const dy = pt.y - beginRef.current.y
    const tooSmall = Math.abs(dx) < MIN_DRAG_PX && Math.abs(dy) < MIN_DRAG_PX

    if (phase === 'selecting') {
      if (tooSmall) {
        // 误触一下：保留旧选区不重置（如果之前没有选区则置 null）
        if (!selection || selection.w === 0) onUpdateSelection(null)
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

      // 提交草稿到历史栈
      onUpdateAnnotations(function (prev) {
        const next = prev.map(function (value) {
          if (value.id !== draftID) return value
          if (isSinglePoint) return value
          if (MULTI_POINT_GRAPHICS.has(value.type)) {
            return {
              ...value,
              points: value.points.concat([{ x: pt.x, y: pt.y }])
            }
          }
          return {
            ...value,
            points: [value.points[0], { x: pt.x, y: pt.y }]
          }
        })
        commitHistory(next)
        return next
      })
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
      if (current.opacity != null) onUpdateOpacity(current.opacity)
      if (current.filled != null) onUpdateFilled(current.filled)
      if (current.fontSize != null) onUpdateFontSize(current.fontSize)
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
    historyRef.current = [[]]
    historyStepRef.current = 0
    syncHistoryFlags()
  }

  /** 取出当前 Stage 选区内的 PNG，触发某个 IO 后关闭截图窗口 */
  async function withExportedPng<T>(action: (dataUrl: string) => Promise<T>) {
    const dataUrl = annotationRef.current?.exportPng()
    if (!dataUrl) return
    try {
      await action(dataUrl)
    } catch (err) {
      console.error('[screenshot] 导出失败', err)
    }
  }

  function handleCopy() {
    void withExportedPng(async function (dataUrl) {
      if (!isTauri()) return
      await writeImageToClipboard(dataUrl)
      await closeScreenshotWindow()
    })
  }

  function handlePreserve() {
    void withExportedPng(async function (dataUrl) {
      if (!isTauri()) return
      const saved = await savePngToAppDir(dataUrl).catch(function (err) {
        console.error('[screenshot] 保存失败', err)
        return null
      })
      if (saved) {
        console.info('[screenshot] 已保存到', saved)
        await closeScreenshotWindow()
      }
    })
  }

  function handlePin() {
    // TODO(Phase 3+)：调用 Rust 端创建一个 alwaysOnTop 透明小窗以贴图
    void withExportedPng(async function (dataUrl) {
      if (!isTauri()) return
      await writeImageToClipboard(dataUrl)
    })
  }

  function handleClose() {
    if (isTauri()) void closeScreenshotWindow()
  }

  useEffect(
    function () {
      if (import.meta.env.DEV) console.log('[DEBUG] annotations', annotations)
    },
    [annotations]
  )

  return (
    <div className={clsx(styles.screenshot)}>
      <Annotation
        ref={annotationRef}
        annotations={annotations}
        clipRect={selection}
        interactive={phase === 'editing'}
        selectedID={selectedID}
        sourceImage={sourceImage}
        onSelect={onUpdateSelectedID}
        onChange={handleAnnotationChange}
        onMove={handleMove}
        onPress={handlePress}
        onRelease={handleRelease}
      />
      {/* 选区遮罩：选区外区域半透明黑色；无选区时整屏黑 */}
      {(() => {
        if (!selection || selection.w <= 0 || selection.h <= 0) {
          return phase === 'selecting' ? (
            <AnimatePresence>
              <motion.div
                key="full-mask"
                className={clsx(styles.fullscreen, styles.mask)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </AnimatePresence>
          ) : null
        }
        const { x, y, w, h } = selection
        return (
          <>
            {/* 上 / 下 / 左 / 右 四块构成选区外遮罩 */}
            <div
              className={styles.selectionMask}
              style={{ left: 0, top: 0, right: 0, height: y }}
            />
            <div
              className={styles.selectionMask}
              style={{ left: 0, top: y + h, right: 0, bottom: 0 }}
            />
            <div
              className={styles.selectionMask}
              style={{ left: 0, top: y, width: x, height: h }}
            />
            <div
              className={styles.selectionMask}
              style={{ left: x + w, top: y, right: 0, height: h }}
            />
            {/* 选区边框 */}
            <div
              className={styles.selectionFrame}
              style={{ left: x, top: y, width: w, height: h }}
            />
            {/* 选区尺寸标签：紧贴选区上沿外侧；上方不够时挪到内部 */}
            <div
              className={styles.selectionSize}
              style={{
                left: x,
                top: y >= 24 ? y - 22 : y + 4
              }}>
              {Math.round(w)} × {Math.round(h)}
            </div>
          </>
        )
      })()}

      {/* 选区阶段的像素级放大镜 */}
      <Magnifier
        sourceImage={sourceImage}
        visible={phase === 'selecting'}
      />

      <Utility
        selection={phase === 'selecting' ? null : selection}
        canRedo={canRedo}
        canUndo={canUndo}
        active={graphics}
        color={color}
        thickness={thickness}
        filled={filled}
        opacity={opacity}
        fontSize={fontSize}
        onClose={handleClose}
        onUpdateColor={handleUpdateColor}
        onUpdateFilled={handleUpdateFilled}
        onUpdateOpacity={handleUpdateOpacity}
        onUpdateFontSize={handleUpdateFontSize}
        onCopy={handleCopy}
        onPin={handlePin}
        onRedo={handleRedo}
        onRefresh={handleRefresh}
        onPreserve={handlePreserve}
        onUpdateThickness={handleUpdateThickness}
        onUndo={handleUndo}
        onUpdateUtility={onUpdateGraphics}
      />
    </div>
  )
}
