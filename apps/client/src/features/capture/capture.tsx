import { Icon } from '@iconify/react/offline'
import {
  Component,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode
} from 'react'

import { clsx } from 'clsx'
import type Konva from 'konva'
import { useHotkeys } from 'react-hotkeys-hook'
import { v4 as UUID } from 'uuid'

import { ContextMenu, useContextMenu, type MenuItem } from '@/components/contextmenu'
import { Annotation, type AnnotationHandle } from '@/features/capture/components/annotation'
import { type GraphicsEnum, type GraphicsProps } from '@/features/capture/components/graphics'
import Magnifier from '@/features/capture/components/magnifier'
import { motion, useReducedMotion } from 'motion/react'
import Utility from '@/features/capture/components/utility'
import { fetchImageFromPath, takePendingScreenshot, takeScreenshot } from '@/features/capture/tauri'
import { copyImage, pinTexture, saveToUserPath } from '@/features/capture/clipboard'
import { findHoverRegion, type CaptureRegion } from '@/features/capture/region'
import { DETECT_WINDOW, useSettingsStore } from '@/stores/setting'

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
  /** false 时不加载截图；为 true 时消费 capture:open 的 pending */
  active?: boolean
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

/** 按住 Shift 时约束为正方形 / 正圆包围盒 */
const RATIO_GRAPHICS = new Set<GraphicsEnum>(['rect', 'ellipse'])

/** 把命中的 id 按 groupID 并集展开（同组成员全部进入选中集） */
function expandSelectionIDs(ids: string[], list: GraphicsProps[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    const item = list.find(function (a) {
      return a.id === id
    })
    if (!item) continue
    if (item.groupID) {
      for (const annotation of list) {
        if (annotation.groupID !== item.groupID) continue
        if (seen.has(annotation.id)) continue
        seen.add(annotation.id)
        result.push(annotation.id)
      }
      continue
    }
    if (seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

/** 从选中集中移除某 id 所属整组（无组则仅移除自身） */
function removeSelectionGroup(selectedIDs: string[], id: string, list: GraphicsProps[]): string[] {
  const item = list.find(function (a) {
    return a.id === id
  })
  if (!item?.groupID) {
    return selectedIDs.filter(function (v) {
      return v !== id
    })
  }
  const groupID = item.groupID
  return selectedIDs.filter(function (v) {
    const annotation = list.find(function (a) {
      return a.id === v
    })
    return annotation?.groupID !== groupID
  })
}

/** Shift：以起点为对角，约束为等宽高（正圆 / 正方形） */
function constrainRatioPoint(origin: Point, pt: Point, shiftKey: boolean): Point {
  if (!shiftKey) return pt
  const dx = pt.x - origin.x
  const dy = pt.y - origin.y
  const size = Math.max(Math.abs(dx), Math.abs(dy))
  const sx = dx === 0 ? (dy >= 0 ? 1 : -1) : Math.sign(dx)
  const sy = dy === 0 ? (dx >= 0 ? 1 : -1) : Math.sign(dy)
  return { x: origin.x + sx * size, y: origin.y + sy * size }
}

export default function Capture(props: CaptureProps = {}) {
  const { onExit, onClose, onTexture, active = true } = props
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
  const [selectedIDs, onUpdateSelectedIDs] = useState<string[]>([])
  const [sourceImage, onUpdateSourceImage] = useState<HTMLImageElement | null>(null)
  /** 截图加载三态：loading 黑罩、ready 可交互、error 错误卡片 */
  const [captureStatus, onUpdateCaptureStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [captureError, onUpdateCaptureError] = useState<string | null>(null)
  /** 可撤销/重做状态（从 historyRef 同步，但需要反应式驱动 UI） */
  const [canUndo, onUpdateCanUndo] = useState(false)
  const [canRedo, onUpdateCanRedo] = useState(false)

  const detect = useSettingsStore(function (state) {
    return state.settings.capture.detect
  })
  const isWindowDetect = detect === DETECT_WINDOW

  const isReducedMotion = useReducedMotion()
  const { present: presentContextMenu } = useContextMenu()

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
  /** 预缓存的窗口矩形（overlay 局部逻辑像素，顶层优先） */
  const regionsRef = useRef<CaptureRegion[]>([])
  /** 按下瞬间的悬停窗口，单击无拖拽时吸附 */
  const snapCandidateRef = useRef<CaptureRegion | null>(null)
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
    onUpdateSelectedIDs([])
    syncHistoryFlags()
  }

  function handleRedo() {
    if (historyStepRef.current >= historyRef.current.length - 1) return
    historyStepRef.current += 1
    onUpdateAnnotations(historyRef.current[historyStepRef.current])
    onUpdateSelectedID(null)
    onUpdateSelectedIDs([])
    syncHistoryFlags()
  }

  /** 删除选中的标注（多选 / 群组时一并删除） */
  function handleDelete() {
    if (selectedIDs.length === 0) return
    const ids = expandSelectionIDs(selectedIDs, annotations)
    const idSet = new Set(ids)
    onUpdateAnnotations(function (prev) {
      const next = prev.filter(function (a) {
        return !idSet.has(a.id)
      })
      commitHistory(next)
      return next
    })
    commitSelection([])
  }

  /** Esc 逐级退出：annotating → editing → 取消选中 → 重选 */
  function handleEscape() {
    if (phase === 'annotating') {
      handleUpdateGraphics(null)
      return
    }
    if (selectedIDs.length > 0) {
      handleSelect(null)
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

  /** 加载底图：open 路径只消费 pending；forceFresh 才再截（重试） */
  async function loadCapture(forceFresh = false) {
    onUpdateCaptureStatus('loading')
    onUpdateCaptureError(null)
    try {
      const result = forceFresh
        ? await takeScreenshot()
        : await takePendingScreenshot()
      if (!result) {
        throw new Error('未找到预截图，请点重试')
      }
      const img = await fetchImageFromPath(result.path)
      regionsRef.current = result.regions ?? []
      onUpdateSourceImage(img)
      onUpdateCaptureStatus('ready')
    } catch (err) {
      console.error('[capture] 真实截图失败', err)
      onUpdateCaptureError(String(err))
      onUpdateCaptureStatus('error')
    }
  }

  const loadStartedRef = useRef(false)

  useEffect(function () {
    void useSettingsStore.getState().toInitialize()
  }, [])

  useEffect(
    function () {
      if (!active) {
        loadStartedRef.current = false
        return
      }
      // 同一次 active 会话只加载一次，避免 Strict Mode 双 mount 吃掉 pending 后静默再截
      if (loadStartedRef.current) return
      loadStartedRef.current = true
      void loadCapture(false)
    },
    [active]
  )

  /** 工具切换时同步 phase（放在事件里，避免 useEffect 级联 setState） */
  function handleUpdateGraphics(next: GraphicsEnum | null) {
    onUpdateGraphics(next)
    if (next) {
      onUpdatePhase('annotating')
      onUpdateSelectedID(null)
      onUpdateSelectedIDs([])
      return
    }
    if (selection) onUpdatePhase('editing')
  }

  /** 从标注同步工具栏默认值（选中时） */
  function syncToolbarFromAnnotation(item: GraphicsProps) {
    onUpdateColor(item.color)
    onUpdateThickness(item.thickness ?? 2)
    if (item.opacity !== null && item.opacity !== undefined) onUpdateOpacity(item.opacity)
    if (item.filled !== null && item.filled !== undefined) onUpdateFilled(item.filled)
    if (item.fontSize !== null && item.fontSize !== undefined) onUpdateFontSize(item.fontSize)
  }

  /** 写入选中集；selectedID 派生为末项 */
  function commitSelection(nextIDs: string[]) {
    onUpdateSelectedIDs(nextIDs)
    onUpdateSelectedID(nextIDs[nextIDs.length - 1] ?? null)
  }

  /** 选中标注时同步工具栏属性；additive 为 Ctrl/Meta 多选（整组加/剔） */
  function handleSelect(id: string | null, options?: { additive?: boolean }) {
    if (!id) {
      commitSelection([])
      return
    }
    const current = annotations.find(function (a) {
      return a.id === id
    })
    if (!current) return

    if (options?.additive) {
      const exists = selectedIDs.includes(id)
      const nextIDs = exists
        ? removeSelectionGroup(selectedIDs, id, annotations)
        : expandSelectionIDs([...selectedIDs, id], annotations)
      commitSelection(nextIDs)
    } else {
      // 有 groupID 时展开为整组，无法单独选中成员
      commitSelection(expandSelectionIDs([id], annotations))
    }
    syncToolbarFromAnnotation(current)
  }

  /** 橡皮筋多选：按 groupID 并集展开（空数组 = 失焦） */
  function handleSelectMany(ids: string[]) {
    if (ids.length === 0) {
      commitSelection([])
      return
    }
    const expanded = expandSelectionIDs(ids, annotations)
    if (expanded.length === 0) {
      commitSelection([])
      return
    }
    commitSelection(expanded)
    const primaryID = expanded[expanded.length - 1]
    const current = primaryID
      ? annotations.find(function (a) {
          return a.id === primaryID
        })
      : undefined
    if (current) syncToolbarFromAnnotation(current)
  }

  /** 选中集整块上移/下移一层（保持相对顺序） */
  function moveAnnotationsLayer(ids: string[], direction: 'up' | 'down') {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    onUpdateAnnotations(function (prev) {
      const indices = ids
        .map(function (id) {
          return prev.findIndex(function (a) {
            return a.id === id
          })
        })
        .filter(function (index) {
          return index >= 0
        })
        .sort(function (a, b) {
          return a - b
        })
      if (indices.length === 0) return prev
      const next = prev.slice()
      if (direction === 'up') {
        const top = indices[indices.length - 1]
        if (top === undefined || top >= next.length - 1) return prev
        for (let i = indices.length - 1; i >= 0; i -= 1) {
          const index = indices[i]
          if (index === undefined || index >= next.length - 1) continue
          const above = next[index + 1]
          if (!above || idSet.has(above.id)) continue
          const current = next[index]
          if (!current) continue
          next[index] = above
          next[index + 1] = current
        }
      } else {
        const bottom = indices[0]
        if (bottom === undefined || bottom <= 0) return prev
        for (let i = 0; i < indices.length; i += 1) {
          const index = indices[i]
          if (index === undefined || index <= 0) continue
          const below = next[index - 1]
          if (!below || idSet.has(below.id)) continue
          const current = next[index]
          if (!current) continue
          next[index] = below
          next[index - 1] = current
        }
      }
      commitHistory(next)
      return next
    })
  }

  /** 批量锁定/解锁：选中集中有未锁则全部锁，否则全部解锁 */
  function toggleAnnotationsLock(ids: string[]) {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    const hasUnlocked = annotations.some(function (a) {
      return idSet.has(a.id) && !a.locked
    })
    const nextLocked = hasUnlocked
    onUpdateAnnotations(function (prev) {
      const next = prev.map(function (a) {
        return idSet.has(a.id) ? { ...a, locked: nextLocked } : a
      })
      commitHistory(next)
      return next
    })
    if (nextLocked) {
      commitSelection([])
    }
  }

  function groupAnnotations(ids: string[]) {
    if (ids.length < 2) return
    const groupID = UUID()
    const idSet = new Set(ids)
    onUpdateAnnotations(function (prev) {
      const next = prev.map(function (a) {
        return idSet.has(a.id) ? { ...a, groupID } : a
      })
      commitHistory(next)
      return next
    })
    commitSelection(ids)
  }

  function ungroupAnnotations(groupID: string) {
    onUpdateAnnotations(function (prev) {
      const next = prev.map(function (a) {
        return a.groupID === groupID ? { ...a, groupID: undefined } : a
      })
      commitHistory(next)
      return next
    })
  }

  /** 复制选中标注到画布（新 id，轻偏移；同组关系保留为新 groupID） */
  function copyAnnotations(ids: string[]) {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    const OFFSET = 12
    const groupMap = new Map<string, string>()
    const sources = annotations.filter(function (a) {
      return idSet.has(a.id)
    })
    if (sources.length === 0) return

    const clones: GraphicsProps[] = sources.map(function (source) {
      let nextGroupID = source.groupID
      if (source.groupID) {
        let mapped = groupMap.get(source.groupID)
        if (!mapped) {
          mapped = UUID()
          groupMap.set(source.groupID, mapped)
        }
        nextGroupID = mapped
      }
      return {
        ...source,
        id: UUID(),
        groupID: nextGroupID,
        locked: false,
        points: source.points.map(function (p) {
          return { x: p.x + OFFSET, y: p.y + OFFSET }
        })
      }
    })

    const cloneIDs = clones.map(function (c) {
      return c.id
    })
    onUpdateAnnotations(function (prev) {
      const next = prev.concat(clones)
      commitHistory(next)
      return next
    })
    commitSelection(cloneIDs)
  }

  /** 右键标注或选中包围盒：弹出上下文菜单；keepSelection 时不改选 */
  function handleContextMenuAnnotation(payload: {
    id: string
    clientX: number
    clientY: number
    keepSelection?: boolean
  }) {
    const target = annotations.find(function (a) {
      return a.id === payload.id
    })
    if (!target) return

    let menuIDs = selectedIDs
    // 已在多选内或明确要求保留选中时，绝不替换选中集
    if (!payload.keepSelection && !selectedIDs.includes(payload.id)) {
      if (target.groupID) {
        menuIDs = annotations
          .filter(function (a) {
            return a.groupID === target.groupID
          })
          .map(function (a) {
            return a.id
          })
      } else {
        menuIDs = [payload.id]
      }
      commitSelection(menuIDs)
      syncToolbarFromAnnotation(target)
    } else if (menuIDs.length === 0) {
      menuIDs = [payload.id]
    }

    const actionIDs = menuIDs.includes(payload.id) ? menuIDs : [payload.id]
    /** 已是同一组则不必再群组；已成组可与其它元素合并为新组 */
    const alreadyOneGroup = (function () {
      if (actionIDs.length < 2) return false
      let shared: string | undefined
      for (const id of actionIDs) {
        const item = annotations.find(function (a) {
          return a.id === id
        })
        const groupID = item?.groupID
        if (!groupID) return false
        if (shared === undefined) shared = groupID
        else if (shared !== groupID) return false
      }
      return shared !== undefined
    })()
    const canGroup = actionIDs.length >= 2 && !alreadyOneGroup
    const isGrouped = Boolean(target.groupID)
    const hasUnlocked = actionIDs.some(function (id) {
      const item = annotations.find(function (a) {
        return a.id === id
      })
      return item && !item.locked
    })
    const layerIndices = actionIDs
      .map(function (id) {
        return annotations.findIndex(function (a) {
          return a.id === id
        })
      })
      .filter(function (index) {
        return index >= 0
      })
    const canMoveUp =
      layerIndices.length > 0 && Math.max.apply(null, layerIndices) < annotations.length - 1
    const canMoveDown = layerIndices.length > 0 && Math.min.apply(null, layerIndices) > 0

    const menuIcon = function (name: string) {
      return (
        <Icon
          icon={name}
          width={14}
          height={14}
        />
      )
    }

    const items: MenuItem[] = [
      {
        key: 'layer-up',
        label: '上移一层',
        icon: menuIcon('mdi:arrange-bring-forward'),
        disabled: !canMoveUp,
        onSelect() {
          moveAnnotationsLayer(actionIDs, 'up')
        }
      },
      {
        key: 'layer-down',
        label: '下移一层',
        icon: menuIcon('mdi:arrange-send-backward'),
        disabled: !canMoveDown,
        onSelect() {
          moveAnnotationsLayer(actionIDs, 'down')
        }
      },
      { type: 'divider' },
      {
        key: 'group',
        label: '群组',
        icon: menuIcon('mdi:group'),
        disabled: !canGroup,
        onSelect() {
          groupAnnotations(actionIDs)
        }
      },
      {
        key: 'ungroup',
        label: '取消群组',
        icon: menuIcon('mdi:ungroup'),
        disabled: !isGrouped,
        onSelect() {
          const groupID = target.groupID
          if (groupID) ungroupAnnotations(groupID)
        }
      },
      { type: 'divider' },
      {
        key: 'lock',
        label: hasUnlocked ? '锁定' : '解锁',
        icon: menuIcon(hasUnlocked ? 'mdi:lock-outline' : 'mdi:lock-open-variant-outline'),
        onSelect() {
          toggleAnnotationsLock(actionIDs)
        }
      },
      {
        key: 'copy',
        label: '复制',
        icon: menuIcon('mdi:content-copy'),
        onSelect() {
          copyAnnotations(actionIDs)
        }
      },
      {
        key: 'delete',
        label: '删除',
        danger: true,
        icon: menuIcon('mdi:delete-outline'),
        onSelect() {
          const idSet = new Set(actionIDs)
          onUpdateAnnotations(function (prev) {
            const next = prev.filter(function (a) {
              return !idSet.has(a.id)
            })
            commitHistory(next)
            return next
          })
          onUpdateSelectedID(null)
          onUpdateSelectedIDs([])
        }
      }
    ]

    presentContextMenu({
      x: payload.clientX,
      y: payload.clientY,
      items
    })
  }

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
      snapCandidateRef.current = isWindowDetect
        ? findHoverRegion(regionsRef.current, pt.x, pt.y)
        : null
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

    if (phase === 'selecting' && isWindowDetect) {
      const hover = findHoverRegion(regionsRef.current, pt.x, pt.y)
      onUpdateSelection(hover)
      return
    }

    // 防御：本轮拖拽已被取消，不再处理后续 move
    if (cancelledRef.current) return

    if (phase === 'annotating' && draftIDRef.current) {
      // 单点型标注不需要在拖拽过程中更新多个顶点
      if (graphics && POINT_SHAPES.has(graphics)) return
      // 将拖拽点约束到裁剪选区内，防止标注超出
      let clamped = selection
        ? {
            x: Math.max(selection.x, Math.min(pt.x, selection.x + selection.w)),
            y: Math.max(selection.y, Math.min(pt.y, selection.y + selection.h))
          }
        : pt
      // 椭圆 / 矩形：Shift → 正圆 / 正方形
      if (graphics && RATIO_GRAPHICS.has(graphics)) {
        clamped = constrainRatioPoint(beginRef.current, clamped, event.evt.shiftKey)
        if (selection) {
          clamped = {
            x: Math.max(selection.x, Math.min(clamped.x, selection.x + selection.w)),
            y: Math.max(selection.y, Math.min(clamped.y, selection.y + selection.h))
          }
        }
      }
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
        const snap = snapCandidateRef.current
        snapCandidateRef.current = null
        if (snap && isWindowDetect) {
          onUpdateSelection(snap)
          onUpdatePhase('editing')
          return
        }
        if (!moved) onUpdateSelection(null)
        return
      }
      snapCandidateRef.current = null
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
      let clamped = selection
        ? {
            x: Math.max(selection.x, Math.min(pt.x, selection.x + selection.w)),
            y: Math.max(selection.y, Math.min(pt.y, selection.y + selection.h))
          }
        : pt
      if (graphics && RATIO_GRAPHICS.has(graphics)) {
        clamped = constrainRatioPoint(beginRef.current, clamped, event.evt.shiftKey)
        if (selection) {
          clamped = {
            x: Math.max(selection.x, Math.min(clamped.x, selection.x + selection.w)),
            y: Math.max(selection.y, Math.min(clamped.y, selection.y + selection.h))
          }
        }
      }
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

  /** 单个标注被拖拽 / Transform 后回写；history=false 时仅预览不记栈 */
  function handleAnnotationChange(
    next: GraphicsProps,
    options?: { history?: boolean }
  ) {
    const shouldCommit = options?.history !== false
    onUpdateAnnotations(function (prev) {
      const updated = prev.map(function (v) {
        return v.id === next.id ? next : v
      })
      if (shouldCommit) commitHistory(updated)
      return updated
    })
  }

  /** 多节点 Transform 结束：一次写回并入历史 */
  function handleAnnotationsBatchChange(nexts: GraphicsProps[]) {
    if (nexts.length === 0) return
    const map = new Map(
      nexts.map(function (item) {
        return [item.id, item] as const
      })
    )
    onUpdateAnnotations(function (prev) {
      const updated = prev.map(function (v) {
        return map.get(v.id) ?? v
      })
      commitHistory(updated)
      return updated
    })
  }

  /**
   * 工具栏属性变更：若已选中 → 批量回写选中集并记入历史；
   * 否则只更新「未来新建」的默认值。
   */
  function applyPropertyToSelected(patch: Partial<GraphicsProps>) {
    if (selectedIDs.length === 0) return
    const ids = expandSelectionIDs(selectedIDs, annotations)
    const idSet = new Set(ids)
    onUpdateAnnotations(function (prev) {
      const updated = prev.map(function (v) {
        return idSet.has(v.id) ? { ...v, ...patch } : v
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
    onUpdateSelectedIDs([])
    onUpdateAnnotations([])
    onUpdatePhase('selecting')
    isDraggingRef.current = false
    cancelledRef.current = false
    hasMovedRef.current = false
    snapCandidateRef.current = null
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

  /** 「复制」：将裁剪+标注后的 PNG 写入系统剪贴板 */
  function handleCopy() {
    void withStagePng(async function (dataUrl) {
      await copyImage(dataUrl)
      onExit?.()
    })
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
                    void loadCapture(true)
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
            {captureStatus === 'loading' && (
              <div
                className={styles.loadingMask}
                aria-busy="true"
                aria-label="正在加载截图"
              />
            )}
            <motion.div
              key="capture-ready"
              initial={isReducedMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.1,
                ease: [0.22, 1, 0.36, 1]
              }}>
              <Annotation
                ref={annotationRef}
                onClose={onClose ?? function () {}}
                onMove={handleMove}
                clipRect={selection}
                onPress={handlePress}
                selectedID={selectedID}
                selectedIDs={selectedIDs}
                annotations={annotations}
                sourceImage={sourceImage}
                onRelease={handleRelease}
                onSelect={handleSelect}
                onSelectMany={handleSelectMany}
                interactive={captureStatus === 'ready'}
                onChange={handleAnnotationChange}
                onBatchChange={handleAnnotationsBatchChange}
                onContextMenuAnnotation={handleContextMenuAnnotation}
                onEditStart={function () {
                  handleSelect(null)
                }}
                selection={selection}
                phase={phase}
                onSelectionChange={onUpdateSelection}
                graphicsActive={graphics !== null}
              />
            </motion.div>

            {/* 选区阶段的像素级放大镜 */}
            <Magnifier
              sourceImage={sourceImage}
              visible={phase === 'selecting' && captureStatus === 'ready'}
              onClose={onClose ?? function () {}}
            />

            {captureStatus === 'ready' && (
              <Utility
                color={color}
                filled={filled}
                canRedo={canRedo}
                canUndo={canUndo}
                active={graphics}
                opacity={opacity}
                onCopy={handleCopy}
                onPin={handlePin}
                fontSize={fontSize}
                onRedo={handleRedo}
                onUndo={handleUndo}
                thickness={thickness}
                onClose={handleClose}
                onRefresh={handleRefresh}
                onSave={handleSave}
                onUpdateColor={handleUpdateColor}
                onUpdateUtility={handleUpdateGraphics}
                onUpdateFilled={handleUpdateFilled}
                onUpdateOpacity={handleUpdateOpacity}
                onUpdateFontSize={handleUpdateFontSize}
                onUpdateThickness={handleUpdateThickness}
                selection={phase === 'selecting' ? null : selection}
              />
            )}
            <ContextMenu.Host />
          </>
        )}
      </div>
    </CaptureErrorBoundary>
  )
}
