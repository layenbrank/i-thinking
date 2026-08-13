import { clsx } from 'clsx'
import type Konva from 'konva'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Layer, Image as ReImage, Stage, Transformer, type KonvaNodeEvents } from 'react-konva'

import Graphics, { SpotlightMask, type GraphicsProps } from '@/features/capture/components/graphics'

import styles from '@/features/capture/components/annotation.module.scss'

interface AnnotationProps {
  annotations: GraphicsProps[]
  /** 当前选中的标注 id（null 表示未选中） */
  selectedID: string | null
  /** 是否启用对已有标注的交互（editing 阶段 = true） */
  interactive: boolean
  /** 滤镜底图（mosaic / blur 共用），也会作为 Stage 背景 */
  sourceImage: HTMLImageElement | null
  /** 裁剪选区：不为空时，标注层会裁剪到该区域内 */
  clipRect: { x: number; y: number; w: number; h: number } | null
  onSelect: (id: string | null) => void
  onChange: (next: GraphicsProps) => void
  onRelease: KonvaNodeEvents['onMouseUp']
  onPress: KonvaNodeEvents['onMouseDown']
  onMove: KonvaNodeEvents['onMouseMove']
  onEditStart: (id: string, text: string) => void
}

/** 暴露给父组件的导出能力 */
export interface AnnotationHandle {
  /** 导出选区内的 PNG data URL；无选区时导出整个 Stage */
  exportPng(): string | null
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
      selectedID,
      sourceImage,
      onChange,
      onSelect,
      onPress,
      onMove,
      onRelease,
      onEditStart
    } = props

    // 底图来自 Tauri 真实截图；加载中为 null，由上层黑罩/错误卡片接管
    const background = sourceImage
    const stageRef = useRef<Konva.Stage>(null)
    const transformerRef = useRef<Konva.Transformer>(null)
    const [editingID, setEditingID] = useState<string | null>(null)
    const [originalText, setOriginalText] = useState('')
    const [editValue, setEditValue] = useState('')
    const composingRef = useRef(false)

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

    useImperativeHandle(
      ref,
      function () {
        return {
          exportPng() {
            const stage = stageRef.current
            if (!stage) return null
            // 导出前临时隐藏 Transformer，避免控制点出现在最终图
            const tr = transformerRef.current
            if (tr) tr.visible(false)
            const opts: {
              pixelRatio: number
              x?: number
              y?: number
              width?: number
              height?: number
            } = {
              pixelRatio: window.devicePixelRatio || 1
            }
            if (clipRect && clipRect.w > 0 && clipRect.h > 0) {
              opts.x = clipRect.x
              opts.y = clipRect.y
              opts.width = clipRect.w
              opts.height = clipRect.h
            }
            const url = stage.toDataURL(opts)
            if (tr) tr.visible(true)
            return url
          },
          getStage() {
            return stageRef.current
          },
          startEditing(id: string, initialText?: string) {
            const text = initialText ?? annotations.find(a => a.id === id)?.text ?? ''
            setEditingID(id)
            setOriginalText(text)
            setEditValue(text)
          }
        }
      },
      [clipRect, annotations]
    )

    /** 选中态变化时把 Transformer 挂到对应 Group 上 */
    useEffect(
      function () {
        const tr = transformerRef.current
        const stage = stageRef.current
        if (!tr || !stage) return
        // 编辑文字时隐藏 Transformer
        if (editingID) {
          tr.nodes([])
          tr.getLayer()?.batchDraw()
          return
        }
        if (!selectedID) {
          tr.nodes([])
          tr.getLayer()?.batchDraw()
          return
        }
        const node = stage.findOne<Konva.Node>('#' + selectedID)
        if (!node) {
          tr.nodes([])
        } else {
          tr.nodes([node])
        }
        tr.getLayer()?.batchDraw()
      },
      [selectedID, annotations, editingID]
    )

    function handleEditStart(id: string, text: string) {
      // 如果正在编辑另一个标注，先提交当前编辑
      if (editingID && editingID !== id) {
        const currentAnnotation = annotations.find(a => a.id === editingID)
        if (currentAnnotation && editValue !== originalText) {
          onChange({ ...currentAnnotation, text: editValue })
        }
      }
      setEditingID(id)
      setOriginalText(text)
      setEditValue(text)
    }

    function handleEditCommit(value: string) {
      const id = editingID
      setEditingID(null)
      onSelect(null)
      if (!id) return
      if (value === originalText) return
      const annotation = annotations.find(a => a.id === id)
      if (annotation) {
        onChange({ ...annotation, text: value })
      }
    }

    function handleEditCancel() {
      setEditingID(null)
      onSelect(null)
    }

    /** 透传 mouseDown，并在编辑阶段点击空白处取消选中 */
    function handleMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
      if (interactive) {
        const clickedOnEmpty = event.target === event.target.getStage()
        if (clickedOnEmpty) {
          if (editingID) {
            handleEditCancel()
          }
          onSelect(null)
        }
      }
      onPress?.(event)
    }

    /** 点击形状时，若正在编辑则先取消编辑态 */
    function handleShapeSelect(id: string) {
      if (editingID) {
        handleEditCancel()
      }
      onSelect(id)
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
          onMouseMove={onMove}
          onMouseDown={handleMouseDown}
          onMouseUp={onRelease}
          width={viewport.width}
          height={viewport.height}
          className={clsx(styles.stage)}>
          {/* 背景层：裁剪的截图（物理像素缩放到 CSS 尺寸） */}
          <Layer listening={false}>
            {background && (
              <ReImage
                image={background}
                width={viewport.width}
                height={viewport.height}
                listening={false}
              />
            )}
          </Layer>
          {/* 聚光灯共享暗罩：一个 even-odd 镂空 Shape，支持任意数量 spotlight 而不出现叠加伪影 */}
          <Layer listening={false}>
            <SpotlightMask
              annotations={annotations}
              width={viewport.width}
              height={viewport.height}
            />
          </Layer>
          {/* 标注层：选区存在时裁剪到选区内，超出部分不可见也不可点击 */}
          <Layer
            clipFunc={
              clipRect && clipRect.w > 0 && clipRect.h > 0
                ? function (ctx) {
                    ctx.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h)
                  }
                : undefined
            }>
            {annotations.map(function (annotation) {
              return (
                <Graphics
                  key={annotation.id}
                  {...withSource(annotation)}
                  interactive={interactive}
                  isSelected={annotation.id === selectedID}
                  isEditing={annotation.id === editingID}
                  onSelect={handleShapeSelect}
                  onEditStart={handleEditStart}
                  onChange={onChange}
                />
              )
            })}

            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              borderStroke="#4080FF"
              borderStrokeWidth={1.5}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
              anchorStroke="#4080FF"
              anchorStrokeWidth={1.5}
              anchorFill="#FFFFFF"
              anchorSize={Math.round(8 * Math.min(window.devicePixelRatio || 1, 2))}
              anchorCornerRadius={50}
              padding={4}
              keepRatio={false}
              flipEnabled={false}
              anchorStyleFunc={(anchor) => {
                anchor.shadowColor('rgba(64, 128, 255, 0.45)')
                anchor.shadowBlur(6)
              }}
              boundBoxFunc={function (source, target) {
                if (Math.abs(target.width) < 10) return source
                if (Math.abs(target.height) < 10) return source
                return target
              }}
            />
          </Layer>
        </Stage>
        {/* 文字编辑 textarea overlay */}
        {editingID && (() => {
          const annotation = annotations.find(a => a.id === editingID)
          if (!annotation || annotation.type !== 'text') return null
          const stage = stageRef.current
          if (!stage) return null
          const group = stage.findOne<Konva.Group>('#' + editingID)
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
              onChange={e => setEditValue(e.target.value)}
              autoFocus
              onBlur={() => handleEditCommit(editValue)}
              onCompositionStart={() => { composingRef.current = true }}
              onCompositionEnd={() => { composingRef.current = false }}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  handleEditCancel()
                } else if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
                  e.preventDefault()
                  handleEditCommit(editValue)
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
