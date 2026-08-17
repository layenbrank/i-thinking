import { clsx } from 'clsx'
import type Konva from 'konva'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Layer, Image as ReImage, Rect, Stage, Transformer, type KonvaNodeEvents } from 'react-konva'

import {
  ANCHOR_SIZE,
  BORDER_STROKE,
  BORDER_WIDTH,
  ROTATE_OFFSET,
  cornerAnchor
} from '@/features/capture/components/corner-handle'
import Graphics, {
  SpotlightMask,
  bakeTransformSize,
  boundsContainsPoint,
  boundsIntersect,
  findDragPeerIDs,
  findGraphicsBounds,
  findKonvaByID,
  findUnionBounds,
  type Bounds,
  type GraphicsProps
} from '@/features/capture/components/graphics'
import { SelectionOverlay, type SelectionOverlayHandle } from '@/features/capture/components/selection-overlay'

import styles from '@/features/capture/components/annotation.module.scss'

/** 橡皮筋视为有效框选的最小对角线像素 */
const MIN_MARQUEE_PX = 3

interface AnnotationContextMenuPayload {
  id: string
  clientX: number
  clientY: number
  /** 为 true 时上层不得改写当前多选 */
  keepSelection?: boolean
}

interface AnnotationProps {
  annotations: GraphicsProps[]
  /** 当前选中的标注 id（null 表示未选中） */
  selectedID: string | null
  /** 多选 id（Ctrl/Meta 叠加；群组点选会展开） */
  selectedIDs: string[]
  /** 是否启用对已有标注的交互（editing 阶段 = true） */
  interactive: boolean
  /** 滤镜底图（mosaic / blur 共用），也会作为 Stage 背景 */
  sourceImage: HTMLImageElement | null
  /** 裁剪选区：不为空时，标注层会裁剪到该区域内 */
  clipRect: { x: number; y: number; w: number; h: number } | null
  onSelect: (id: string | null, options?: { additive?: boolean }) => void
  /** 橡皮筋多选结果（可为空数组表示失焦） */
  onSelectMany?: (ids: string[]) => void
  onChange: (next: GraphicsProps, options?: { history?: boolean }) => void
  /** 多节点 Transform 结束批量回写 */
  onBatchChange?: (nexts: GraphicsProps[]) => void
  onRelease: KonvaNodeEvents['onMouseUp']
  onPress: KonvaNodeEvents['onMouseDown']
  onMove: KonvaNodeEvents['onMouseMove']
  onEditStart: (id: string, text: string) => void
  /** 右键命中标注，或落在当前选中并集 AABB 内 */
  onContextMenuAnnotation?: (payload: AnnotationContextMenuPayload) => void
  selection: { x: number; y: number; w: number; h: number } | null
  phase: 'selecting' | 'annotating' | 'editing'
  onSelectionChange: (selection: { x: number; y: number; w: number; h: number }) => void
  graphicsActive?: boolean
  onClose: () => void
}

/** 自命中节点向上查找 name=annotation 的 Group */
function findAnnotationNode(target: Konva.Node): Konva.Node | null {
  let node: Konva.Node | null = target
  while (node) {
    if (node.name() === 'annotation') return node
    node = node.getParent()
  }
  return null
}

/** 是否点在 Transformer / 裁剪手柄上（这些位置不启动橡皮筋） */
function isMarqueeBlockedTarget(target: Konva.Node): boolean {
  let node: Konva.Node | null = target
  while (node) {
    if (node.getClassName() === 'Transformer') return true
    if (node.name() === 'selection-overlay-layer') return true
    node = node.getParent()
  }
  return false
}

/** 命中是否为当前已选中的标注（已选中则走拖拽，不抢橡皮筋） */
function isSelectedAnnotationTarget(target: Konva.Node, selectedIDs: string[]): boolean {
  const annotation = findAnnotationNode(target)
  if (!annotation) return false
  return selectedIDs.includes(annotation.id())
}

/** 用 Konva 节点真实包围盒做相交（比纯 points AABB 更准） */
function findNodeBounds(stage: Konva.Stage, id: string): Bounds | null {
  const node = findKonvaByID(stage, id)
  if (!node) return null
  const rect = node.getClientRect({ relativeTo: stage })
  if (rect.width <= 0 && rect.height <= 0) return null
  return { x: rect.x, y: rect.y, w: Math.max(rect.width, 1), h: Math.max(rect.height, 1) }
}

/** 右键几何探测：含锁定项（listening=false 时仍可解锁） */
function findAnnotationAtPoint(
  stage: Konva.Stage,
  annotations: GraphicsProps[],
  pt: { x: number; y: number }
): GraphicsProps | null {
  // 从上到下（数组末尾更靠上）
  for (let i = annotations.length - 1; i >= 0; i -= 1) {
    const annotation = annotations[i]
    if (!annotation) continue
    const bounds = findNodeBounds(stage, annotation.id) ?? findGraphicsBounds(annotation)
    if (bounds && boundsContainsPoint(bounds, pt.x, pt.y)) {
      return annotation
    }
  }
  return null
}

function clampPointToClip(
  pt: { x: number; y: number },
  clip: { x: number; y: number; w: number; h: number } | null
): { x: number; y: number } {
  if (!clip || clip.w <= 0 || clip.h <= 0) return pt
  return {
    x: Math.max(clip.x, Math.min(pt.x, clip.x + clip.w)),
    y: Math.max(clip.y, Math.min(pt.y, clip.y + clip.h))
  }
}

function findSelectedUnionBounds(
  annotations: GraphicsProps[],
  selectedIDs: string[],
  stage?: Konva.Stage | null
): Bounds | null {
  const idSet = new Set(selectedIDs)
  const boxes: Bounds[] = []
  for (const annotation of annotations) {
    if (!idSet.has(annotation.id)) continue
    const box =
      (stage ? findNodeBounds(stage, annotation.id) : null) ?? findGraphicsBounds(annotation)
    if (box) boxes.push(box)
  }
  return findUnionBounds(boxes)
}

/** 橡皮筋命中：输出原始命中 id（含缝隙：并集相交则推入该组任一成员）；整组展开由 expandSelectionIDs 负责 */
function findMarqueeHitIDs(
  annotations: GraphicsProps[],
  box: Bounds,
  stage: Konva.Stage | null
): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  const groupBoxes = new Map<string, Bounds[]>()

  function pushID(id: string) {
    if (seen.has(id)) return
    seen.add(id)
    ids.push(id)
  }

  for (const annotation of annotations) {
    if (annotation.locked) continue
    const bounds =
      (stage ? findNodeBounds(stage, annotation.id) : null) ?? findGraphicsBounds(annotation)
    if (!bounds) continue
    if (annotation.groupID) {
      const list = groupBoxes.get(annotation.groupID) ?? []
      list.push(bounds)
      groupBoxes.set(annotation.groupID, list)
    }
    if (boundsIntersect(bounds, box)) pushID(annotation.id)
  }

  // 缝隙：并集相交但未点中任一单员时，推入该组第一个未锁定成员
  groupBoxes.forEach(function (boxes, groupID) {
    const union = findUnionBounds(boxes)
    if (!union || !boundsIntersect(union, box)) return
    const already = annotations.some(function (annotation) {
      return annotation.groupID === groupID && seen.has(annotation.id)
    })
    if (already) return
    for (const annotation of annotations) {
      if (annotation.locked || annotation.groupID !== groupID) continue
      pushID(annotation.id)
      return
    }
  })

  return ids
}

/** 暴露给父组件的画布渲染能力 */
export interface AnnotationHandle {
  /** 渲染选区内的 PNG data URL；无选区时渲染整个 Stage */
  renderPng(): string | null
  /** 获取底层 Stage 节点（高级用法） */
  getStage(): Konva.Stage | null
  /** 启动指定文字标注的编辑态（可传入初始文本，用于新建标注时尚未入态的场景） */
  startEditing(id: string, initialText?: string): void
}

export const Annotation = forwardRef<AnnotationHandle, AnnotationProps>(
  function Annotation(props, ref) {
    const {
      annotations,
      clipRect,
      interactive,
      selectedIDs,
      sourceImage,
      onChange,
      onSelect,
      onSelectMany,
      onPress,
      onMove,
      onRelease,
      onEditStart,
      onContextMenuAnnotation,
      onClose,
      onBatchChange,
      phase,
      graphicsActive
    } = props

    // 底图来自 Tauri 真实截图；加载中为 null，由上层黑罩/错误卡片接管
    const background = sourceImage
    const stageRef = useRef<Konva.Stage>(null)
    const transformerRef = useRef<Konva.Transformer>(null)
    const selectionOverlayRef = useRef<SelectionOverlayHandle>(null)
    const [editingID, setEditingID] = useState<string | null>(null)
    const [originalText, setOriginalText] = useState('')
    const [editValue, setEditValue] = useState('')
    const composingRef = useRef(false)
    /** 橡皮筋起点；非空表示正在框选（兼作 marqueeActive） */
    const marqueeStartRef = useRef<{ x: number; y: number } | null>(null)
    const marqueeBoxRef = useRef<Bounds | null>(null)
    /** 有效框选结束后吞掉同一次手势的 click，避免多选被点选冲掉 */
    const ignoreSelectClickRef = useRef(false)
    const [marqueeBox, setMarqueeBox] = useState<Bounds | null>(null)
    const annotationsRef = useRef(annotations)
    annotationsRef.current = annotations
    const clipRectRef = useRef(clipRect)
    clipRectRef.current = clipRect
    const onSelectRef = useRef(onSelect)
    onSelectRef.current = onSelect
    const onSelectManyRef = useRef(onSelectMany)
    onSelectManyRef.current = onSelectMany

    /** 窗口级橡皮筋监听（稳定函数引用，便于 add/remove） */
    const marqueeApiRef = useRef<{
      move: (native: MouseEvent) => void
      up: () => void
      finish: () => void
    } | null>(null)
    if (!marqueeApiRef.current) {
      marqueeApiRef.current = {
        move(native: MouseEvent) {
          const stage = stageRef.current
          if (!stage || !marqueeStartRef.current) return
          const rect = stage.container().getBoundingClientRect()
          const scaleX = stage.width() / Math.max(rect.width, 1)
          const scaleY = stage.height() / Math.max(rect.height, 1)
          const pt = clampPointToClip(
            {
              x: (native.clientX - rect.left) * scaleX,
              y: (native.clientY - rect.top) * scaleY
            },
            clipRectRef.current
          )
          const start = marqueeStartRef.current
          const box: Bounds = {
            x: Math.min(start.x, pt.x),
            y: Math.min(start.y, pt.y),
            w: Math.abs(pt.x - start.x),
            h: Math.abs(pt.y - start.y)
          }
          marqueeBoxRef.current = box
          setMarqueeBox(box)
        },
        finish() {
          const api = marqueeApiRef.current
          if (!api || !marqueeStartRef.current) return
          marqueeStartRef.current = null
          window.removeEventListener('mousemove', api.move)
          window.removeEventListener('mouseup', api.up)
          const box = marqueeBoxRef.current
          marqueeBoxRef.current = null
          setMarqueeBox(null)
          const diag = box ? Math.hypot(box.w, box.h) : 0
          // 微移：只收起框选，点选交给 Graphics onClick / 空白失焦
          if (!box || diag < MIN_MARQUEE_PX) return
          const ids = findMarqueeHitIDs(annotationsRef.current, box, stageRef.current)
          // mouseup 后图形还会再发 click，不吞掉会把多选冲成单选
          ignoreSelectClickRef.current = true
          window.setTimeout(function () {
            ignoreSelectClickRef.current = false
          }, 0)
          if (onSelectManyRef.current) {
            onSelectManyRef.current(ids)
          } else if (ids.length === 0) {
            onSelectRef.current(null)
          } else {
            onSelectRef.current(ids[ids.length - 1] ?? null)
          }
        },
        up() {
          marqueeApiRef.current?.finish()
        }
      }
    }
    const marqueeApi = marqueeApiRef.current

    useEffect(function () {
      return function () {
        window.removeEventListener('mousemove', marqueeApi.move)
        window.removeEventListener('mouseup', marqueeApi.up)
      }
    }, [marqueeApi])

    /** 视口尺寸：跟随 window resize 同步，保证 Stage / 共享暗罩自适应 */
    const [viewport, setViewport] = useState<{ width: number; height: number }>(function () {
      return { width: window.innerWidth, height: window.innerHeight }
    })
    useEffect(function () {
      function onResize() {
        setViewport({ width: window.innerWidth, height: window.innerHeight })
      }
      window.addEventListener('resize', onResize)
      return function () {
        window.removeEventListener('resize', onResize)
      }
    }, [])

    /**
     * 用系统 DPR 对齐：stage 逻辑尺寸 = 截图像素 / dpr，canvas 缓冲与 PNG 1:1，
     * 避免按 window 尺寸 × 近似 scale 产生亚像素再采样发糊。
     * 底图必须画在 Konva 上（勿改 HTML backdrop + 透明 Stage，会丢框选）。
     * 详见：apps/client/docs/capture-sharpness-and-selection.md
     */
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const stageWidth =
      background && background.naturalWidth > 0
        ? background.naturalWidth / dpr
        : viewport.width
    const stageHeight =
      background && background.naturalHeight > 0
        ? background.naturalHeight / dpr
        : viewport.height
    const pixelRatio = dpr

    useImperativeHandle(
      ref,
      function () {
        return {
          renderPng() {
            const stage = stageRef.current
            if (!stage) return null
            const tr = transformerRef.current
            if (tr) tr.visible(false)
            const maskLayers = stage.find(function (node: Konva.Node) {
              return node.name() === 'selection-overlay-layer'
            })
            maskLayers.forEach(function (layer) {
              layer.visible(false)
            })
            const opts: {
              pixelRatio: number
              x?: number
              y?: number
              width?: number
              height?: number
            } = {
              // 与 Stage / 截图 DPR 对齐，导出物理像素与屏幕一致
              pixelRatio
            }
            if (clipRect && clipRect.w > 0 && clipRect.h > 0) {
              opts.x = clipRect.x
              opts.y = clipRect.y
              opts.width = clipRect.w
              opts.height = clipRect.h
            }
            const url = stage.toDataURL(opts)
            maskLayers.forEach(function (layer) {
              layer.visible(true)
            })
            if (tr) tr.visible(true)
            return url
          },
          getStage() {
            return stageRef.current
          },
          startEditing(id: string, initialText?: string) {
            const text = initialText ?? annotations.find((a) => a.id === id)?.text ?? ''
            setEditingID(id)
            setOriginalText(text)
            setEditValue(text)
          }
        }
      },
      [clipRect, annotations, pixelRatio]
    )

    /** 选中态：挂载全部未锁定选中节点到 Transformer（支持整组变换） */
    useEffect(
      function () {
        const tr = transformerRef.current
        const stage = stageRef.current
        if (!tr || !stage) return
        if (editingID) {
          tr.nodes([])
          tr.getLayer()?.batchDraw()
          return
        }
        if (selectedIDs.length === 0) {
          tr.nodes([])
          tr.getLayer()?.batchDraw()
          return
        }
        const nodes: Konva.Node[] = []
        for (const id of selectedIDs) {
          const annotation = annotations.find(function (a) {
            return a.id === id
          })
          if (annotation?.locked) continue
          const node = findKonvaByID(stage, id)
          if (node) nodes.push(node)
        }
        tr.nodes(nodes)
        tr.getLayer()?.batchDraw()
      },
      [selectedIDs, annotations, editingID]
    )

    function handleTransformerEnd() {
      const tr = transformerRef.current
      if (!tr) return
      const nodes = tr.nodes()
      const updates: GraphicsProps[] = []
      for (const node of nodes) {
        const id = node.id()
        const propsForNode = annotations.find(function (a) {
          return a.id === id
        })
        if (!propsForNode) continue
        const next = bakeTransformSize(node, propsForNode)
        if (next) updates.push(next)
      }
      if (updates.length > 0) {
        if (onBatchChange) {
          onBatchChange(updates)
        } else {
          for (const item of updates) {
            onChange(item, { history: true })
          }
        }
      }
      tr.forceUpdate()
      tr.getLayer()?.batchDraw()
    }

    function handleClose() {
      onClose?.()
    }

    function handleEditStart(id: string, text: string) {
      // 如果正在编辑另一个标注，先提交当前编辑
      if (editingID && editingID !== id) {
        const currentAnnotation = annotations.find((a) => a.id === editingID)
        if (currentAnnotation && editValue !== originalText) {
          onChange({ ...currentAnnotation, text: editValue })
        }
      }
      setEditingID(id)
      setOriginalText(text)
      setEditValue(text)
      onEditStart(id, text)
    }

    function handleEditCommit(value: string) {
      const id = editingID
      setEditingID(null)
      onSelect(null)
      if (!id) return
      if (value === originalText) return
      const annotation = annotations.find((a) => a.id === id)
      if (annotation) {
        onChange({ ...annotation, text: value })
      }
    }

    function handleEditCancel() {
      setEditingID(null)
      onSelect(null)
    }

    /** Stage 级 mouseMove：选区手柄 / 标注层（框选跟踪只走 window） */
    function handleStageMouseMove(event: Konva.KonvaEventObject<MouseEvent>) {
      const stage = stageRef.current ?? event.target.getStage()
      if (stage) {
        const pt = stage.getPointerPosition()
        if (pt) selectionOverlayRef.current?.handleStageMouseMove(pt)
      }
      onMove?.(event)
    }

    /** Stage 级 mouseUp：结束裁剪手柄，再回传标注层（框选结束只走 window mouseup） */
    function handleStageMouseUp(event: Konva.KonvaEventObject<MouseEvent>) {
      selectionOverlayRef.current?.handleStageMouseUp()
      onRelease?.(event)
    }

    /** 透传 mouseDown：左键空白失焦 / 橡皮筋；右键不清除选中 */
    function handleMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
      // 右键 / 中键：不触发失焦与框选，避免 contextmenu 前清选
      if (event.evt.button !== 0) {
        onPress?.(event)
        return
      }

      const blocked = isMarqueeBlockedTarget(event.target)
      const onSelected = isSelectedAnnotationTarget(event.target, selectedIDs)
      // 已选中 → 拖拽移动；未选中/空白 → 橡皮筋；Shift+已选中 → 仍可框选（结果替换选中集）
      const canMarquee =
        interactive &&
        phase !== 'selecting' &&
        !graphicsActive &&
        annotations.length > 0 &&
        !blocked &&
        (!onSelected || event.evt.shiftKey === true)

      if (canMarquee) {
        const stage = stageRef.current ?? event.target.getStage()
        const pt = stage?.getPointerPosition()
        if (pt && stage) {
          if (editingID) {
            handleEditCancel()
          }
          const start = clampPointToClip(pt, clipRectRef.current)
          marqueeStartRef.current = start
          const box: Bounds = { x: start.x, y: start.y, w: 0, h: 0 }
          marqueeBoxRef.current = box
          setMarqueeBox(box)
          window.addEventListener('mousemove', marqueeApi.move)
          window.addEventListener('mouseup', marqueeApi.up)
        }
        onPress?.(event)
        return
      }

      if (interactive && !graphicsActive) {
        const clickedOnEmpty = !findAnnotationNode(event.target)
        if (clickedOnEmpty && !blocked) {
          if (editingID) {
            handleEditCancel()
          }
          onSelect(null)
        }
      }
      onPress?.(event)
    }

    /** 点击形状时，若正在编辑则先取消编辑态 */
    function handleShapeSelect(id: string, options?: { additive?: boolean }) {
      if (ignoreSelectClickRef.current) return
      if (editingID) {
        handleEditCancel()
      }
      onSelect(id, options)
    }

    /** Stage 右键：标注命中（含锁定几何探测），或落在选中并集 AABB 内 */
    function handleStageContextMenu(event: Konva.KonvaEventObject<PointerEvent>) {
      event.evt.preventDefault()
      if (!interactive) return
      const stage = stageRef.current ?? event.target.getStage()
      const pt = stage?.getPointerPosition()

      const node = findAnnotationNode(event.target)
      if (node) {
        const id = node.id()
        if (!id) return
        onContextMenuAnnotation?.({
          id,
          clientX: event.evt.clientX,
          clientY: event.evt.clientY,
          keepSelection: selectedIDs.includes(id)
        })
        return
      }

      // 锁定项 listening=false：用几何命中补一次（解锁）
      if (stage && pt) {
        const probed = findAnnotationAtPoint(stage, annotations, pt)
        if (probed) {
          onContextMenuAnnotation?.({
            id: probed.id,
            clientX: event.evt.clientX,
            clientY: event.evt.clientY,
            keepSelection: selectedIDs.includes(probed.id)
          })
          return
        }
      }

      const primaryID = selectedIDs[selectedIDs.length - 1]
      if (!primaryID || !stage || !pt) return
      const union = findSelectedUnionBounds(annotations, selectedIDs, stage)
      if (!union || !boundsContainsPoint(union, pt.x, pt.y)) return
      onContextMenuAnnotation?.({
        id: primaryID,
        clientX: event.evt.clientX,
        clientY: event.evt.clientY,
        keepSelection: true
      })
    }

    /** 把滤镜底图自动注入到 mosaic / blur 类型的标注上 */
    function withSource(annotation: GraphicsProps): GraphicsProps {
      if (!sourceImage) return annotation
      if (annotation.type !== 'mosaic' && annotation.type !== 'blur') return annotation
      return { ...annotation, sourceImage }
    }

    return (
      <div className={clsx(styles.annotation)}>
        <Stage
          ref={stageRef}
          onMouseMove={handleStageMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleStageMouseUp}
          onContextMenu={handleStageContextMenu}
          width={stageWidth}
          height={stageHeight}
          pixelRatio={pixelRatio}>
          <Layer listening={false} imageSmoothingEnabled={false}>
            {background && (
              <ReImage
                image={background}
                x={0}
                y={0}
                width={stageWidth}
                height={stageHeight}
                listening={false}
                perfectDrawEnabled={false}
                imageSmoothingEnabled={false}
              />
            )}
          </Layer>
          <SelectionOverlay
            ref={selectionOverlayRef}
            selection={props.selection}
            phase={props.phase}
            width={stageWidth}
            height={stageHeight}
            onSelectionChange={props.onSelectionChange}
            graphicsActive={props.graphicsActive}
            hasAnnotations={annotations.length > 0}
          />
          <Layer listening={false}>
            <SpotlightMask
              annotations={annotations}
              width={stageWidth}
              height={stageHeight}
            />
          </Layer>
          <Layer
            listening={annotations.length > 0}
            clipFunc={
              clipRect && clipRect.w > 0 && clipRect.h > 0
                ? function (ctx) {
                    ctx.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h)
                  }
                : undefined
            }>
            {annotations.map(function (annotation) {
              const peerIDs = findDragPeerIDs(annotation, annotations, selectedIDs)
              const isGrouped = Boolean(annotation.groupID)
              return (
                <Graphics
                  key={annotation.id}
                  {...withSource(annotation)}
                  interactive={interactive}
                  isSelected={selectedIDs.includes(annotation.id)}
                  hideSelectFrame={selectedIDs.length > 1 || isGrouped}
                  dragPeerIDs={peerIDs}
                  findGraphics={function (id) {
                    return annotations.find(function (a) {
                      return a.id === id
                    })
                  }}
                  isEditing={annotation.id === editingID}
                  onSelect={handleShapeSelect}
                  onEditStart={handleEditStart}
                  onChange={onChange}
                  onBatchChange={onBatchChange}
                  marqueeStartRef={marqueeStartRef}
                />
              )
            })}

            <Transformer
              ref={transformerRef}
              anchorSize={ANCHOR_SIZE}
              anchorCornerRadius={0}
              anchorStyleFunc={cornerAnchor}
              borderStroke={BORDER_STROKE}
              borderStrokeWidth={BORDER_WIDTH}
              rotateEnabled={true}
              rotateAnchorOffset={ROTATE_OFFSET}
              rotationSnaps={[0, 90, 180, 270]}
              rotationSnapTolerance={15}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
              ignoreStroke={true}
              // Shift 时 Konva 内置 keepProportion；椭圆画圆在 capture 拖拽阶段另做约束
              keepRatio={false}
              flipEnabled={false}
              padding={0}
              boundBoxFunc={function (oldBox, newBox) {
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox
                }
                return newBox
              }}
              onTransformEnd={handleTransformerEnd}
            />
          </Layer>
          {marqueeBox && marqueeBox.w + marqueeBox.h > 0 && (
            <Layer listening={false}>
              <Rect
                x={marqueeBox.x}
                y={marqueeBox.y}
                width={marqueeBox.w}
                height={marqueeBox.h}
                fill="rgba(64, 128, 255, 0.15)"
                stroke="#4080ff"
                strokeWidth={1}
                dash={[4, 4]}
                perfectDrawEnabled={false}
              />
            </Layer>
          )}
        </Stage>
        {/* 文字编辑 textarea overlay */}
        {editingID &&
          (() => {
            const annotation = annotations.find((a) => a.id === editingID)
            if (!annotation || annotation.type !== 'text') return null
            const stage = stageRef.current
            if (!stage) return null
            const group = findKonvaByID(stage, editingID) as Konva.Group | null
            const textNode = group?.findOne<Konva.Text>('Text')
            if (!textNode) return null

            const containerRect = stage.container().getBoundingClientRect()
            const absPos = textNode.absolutePosition()
            const fontSize = annotation.fontSize ?? 16
            const textWidth = textNode.width() || 80
            const textHeight = fontSize * 1.4

            return (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                onBlur={() => { handleEditCommit(editValue); handleClose() }}
                onCompositionStart={() => {
                  composingRef.current = true
                }}
                onCompositionEnd={() => {
                  composingRef.current = false
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    handleEditCancel()
                  } else if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
                    e.preventDefault()
                    handleEditCommit(editValue)
                    handleClose()
                  }
                }}
                style={{
                  position: 'fixed',
                  left: `${containerRect.left + absPos.x}px`,
                  top: `${containerRect.top + absPos.y}px`,
                  minWidth: `${Math.max(textWidth, 80)}px`,
                  minHeight: `${textHeight}px`,
                  margin: 0,
                  padding: '2px 4px',
                  fontSize: `${fontSize}px`,
                  lineHeight: 1.2,
                  fontFamily: 'sans-serif',
                  color: annotation.color,
                  background: 'rgba(255, 255, 255, 0.92)',
                  border: '1px dashed #4080ff',
                  outline: 'none',
                  resize: 'both',
                  boxSizing: 'border-box',
                  zIndex: 10000
                }}
              />
            )
          })()}
      </div>
    )
  }
)
