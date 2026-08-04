import { Icon } from '@iconify/react/offline'
import type Konva from 'konva'
import { useRef, useState } from 'react'
import { Ellipse, Group, Image as KonvaImage, Layer, Rect, Stage, Text } from 'react-konva'
import useImage from 'use-image'
import { useShallow } from 'zustand/react/shallow'

import { selectCurrentPageAnnotations, useMorphStore } from '@/stores/morph.ts'
import styles from './canvas.module.scss'

// ─── Tool hint text ────────────────────────────────────────────────────────────

const DEFAULT_COLORS: Record<Morph.Tool, string> = {
  select: '#000000',
  text: '#000000',
  highlight: '#FFE066',
  shape: '#1677ff',
  stamp: '#ff4d4f',
  crop: '#000000',
  rotate: '#000000'
}

// ─── Layer 1: PDF Image ───────────────────────────────────────────────────────

function PdfLayer({
  pageImg,
  width,
  height
}: {
  pageImg: Morph.PageImage | undefined
  width: number
  height: number
}) {
  const src = pageImg ? `data:image/png;base64,${pageImg.data_base64}` : ''
  const [image] = useImage(src)
  return (
    <KonvaImage
      image={image}
      width={width}
      height={height}
    />
  )
}

// ─── Layer 2: Annotations ─────────────────────────────────────────────────────

function AnnotationLayer({
  annotations,
  stageW,
  stageH,
  selectedId,
  onSelect
}: {
  annotations: Morph.Annotation[]
  stageW: number
  stageH: number
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <>
      {annotations.map((ann) => {
        const x = ann.rect.x * stageW
        const y = ann.rect.y * stageH
        const w = ann.rect.w * stageW
        const h = ann.rect.h * stageH
        const isSelected = ann.id === selectedId

        if (ann.type === 'highlight') {
          const d = ann.data as Morph.HighlightData
          return (
            <Rect
              key={ann.id}
              x={x}
              y={y}
              width={w}
              height={h}
              fill={d.color}
              opacity={d.opacity}
              stroke={isSelected ? '#1677ff' : undefined}
              strokeWidth={isSelected ? 1 : 0}
              onClick={(e) => {
                e.cancelBubble = true
                onSelect(ann.id)
              }}
            />
          )
        }

        if (ann.type === 'shape') {
          const d = ann.data as Morph.ShapeData
          const fill = d.fill === 'none' ? 'transparent' : d.fill
          const stroke = isSelected ? '#1677ff' : d.stroke
          if (d.kind === 'ellipse') {
            return (
              <Ellipse
                key={ann.id}
                x={x + w / 2}
                y={y + h / 2}
                radiusX={w / 2}
                radiusY={h / 2}
                stroke={stroke}
                fill={fill}
                strokeWidth={d.strokeWidth}
                opacity={d.opacity}
                onClick={(e) => {
                  e.cancelBubble = true
                  onSelect(ann.id)
                }}
              />
            )
          }
          return (
            <Rect
              key={ann.id}
              x={x}
              y={y}
              width={w}
              height={h}
              stroke={stroke}
              fill={fill}
              strokeWidth={d.strokeWidth}
              opacity={d.opacity}
              onClick={(e) => {
                e.cancelBubble = true
                onSelect(ann.id)
              }}
            />
          )
        }

        if (ann.type === 'text-note') {
          const d = ann.data as Morph.TextNoteData
          return (
            <Group
              key={ann.id}
              onClick={(e) => {
                e.cancelBubble = true
                onSelect(ann.id)
              }}>
              <Rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill="rgba(255,255,200,0.85)"
                stroke={isSelected ? '#1677ff' : '#ccc'}
                strokeWidth={1}
                cornerRadius={3}
              />
              <Text
                x={x + 4}
                y={y + 4}
                width={w - 8}
                height={h - 8}
                text={d.content}
                fontSize={d.fontSize}
                fill={d.color}
                fontFamily={d.fontFamily}
                wrap="word"
                ellipsis={true}
              />
            </Group>
          )
        }

        if (ann.type === 'stamp') {
          const d = ann.data as Morph.StampData
          return (
            <Group
              key={ann.id}
              onClick={(e) => {
                e.cancelBubble = true
                onSelect(ann.id)
              }}>
              <Rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill="transparent"
                stroke={isSelected ? '#1677ff' : d.color}
                strokeWidth={2}
                cornerRadius={4}
              />
              <Text
                x={x}
                y={y}
                width={w}
                height={h}
                text={d.label}
                fontSize={16}
                fill={d.color}
                align="center"
                verticalAlign="middle"
              />
            </Group>
          )
        }

        return null
      })}
    </>
  )
}

// ─── Draft shape while drawing ────────────────────────────────────────────────

interface DraftRect {
  x: number
  y: number
  width: number
  height: number
}

function DraftLayer({ draft, tool }: { draft: DraftRect | null; tool: Morph.Tool }) {
  if (!draft) return null
  const color = DEFAULT_COLORS[tool]

  if (tool === 'highlight') {
    return (
      <Rect
        {...draft}
        fill={color}
        opacity={0.35}
        listening={false}
      />
    )
  }

  if (tool === 'shape' || tool === 'crop' || tool === 'text') {
    return (
      <Rect
        {...draft}
        fill="transparent"
        stroke={color}
        strokeWidth={1.5}
        dash={[4, 3]}
        listening={false}
      />
    )
  }

  return null
}

// ─── Main Canvas ──────────────────────────────────────────────────────────────

export default function Canvas() {
  const file = useMorphStore((s) => s.file)
  const currentPage = useMorphStore((s) => s.currentPage)
  const zoom = useMorphStore((s) => s.zoom)
  const activeTool = useMorphStore((s) => s.activeTool)
  const pageCache = useMorphStore((s) => s.pageCache)
  const isLoading = useMorphStore((s) => s.isLoading)
  const selectedId = useMorphStore((s) => s.selectedAnnotationId)
  const pageAnnotations = useMorphStore(useShallow(selectCurrentPageAnnotations))
  const selectAnnotation = useMorphStore((s) => s.selectAnnotation)
  const addAnnotation = useMorphStore((s) => s.addAnnotation)
  const openFilePicker = useMorphStore((s) => s.openFilePicker)

  const drawStart = useRef<{ x: number; y: number } | null>(null)
  const [draft, setDraft] = useState<DraftRect | null>(null)

  const pageImg = pageCache[currentPage]
  const pageWidth = file?.page_width ?? 595
  const pageHeight = file?.page_height ?? 842

  const stageW = pageImg?.width ?? Math.round(pageWidth * zoom * 2)
  const stageH = pageImg?.height ?? Math.round(pageHeight * zoom * 2)

  const isCursorCrosshair = ['highlight', 'shape', 'crop', 'text'].includes(activeTool)

  // ── mouse handlers ─────────────────────────────────────────────────────

  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (activeTool === 'select') {
      if (e.target === e.target.getStage()) selectAnnotation(null)
      return
    }
    if (!['highlight', 'shape', 'crop', 'text'].includes(activeTool)) return
    const pos = e.target.getStage()!.getPointerPosition()!
    drawStart.current = pos
    setDraft({ x: pos.x, y: pos.y, width: 0, height: 0 })
  }

  function handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!drawStart.current) return
    const pos = e.target.getStage()!.getPointerPosition()!
    const { x: sx, y: sy } = drawStart.current
    setDraft({
      x: Math.min(sx, pos.x),
      y: Math.min(sy, pos.y),
      width: Math.abs(pos.x - sx),
      height: Math.abs(pos.y - sy)
    })
  }

  function cancelDraw() {
    drawStart.current = null
    setDraft(null)
  }

  async function handleMouseUp() {
    if (!draft || !drawStart.current) return
    const { x, y, width, height } = draft
    drawStart.current = null
    setDraft(null)

    if (width < 4 || height < 4) return

    const nx = x / stageW
    const ny = y / stageH
    const nw = width / stageW
    const nh = height / stageH

    if (activeTool === 'highlight') {
      await addAnnotation({
        pageIndex: currentPage,
        type: 'highlight',
        rect: { x: nx, y: ny, w: nw, h: nh },
        data: { color: DEFAULT_COLORS.highlight, opacity: 0.4 } as Morph.HighlightData
      })
    } else if (activeTool === 'shape') {
      await addAnnotation({
        pageIndex: currentPage,
        type: 'shape',
        rect: { x: nx, y: ny, w: nw, h: nh },
        data: {
          kind: 'rect',
          stroke: DEFAULT_COLORS.shape,
          fill: 'none',
          strokeWidth: 2,
          opacity: 1
        } as Morph.ShapeData
      })
    } else if (activeTool === 'text') {
      await addAnnotation({
        pageIndex: currentPage,
        type: 'text-note',
        rect: { x: nx, y: ny, w: nw, h: nh },
        data: {
          content: '',
          fontSize: 14,
          color: '#000000',
          fontFamily: 'sans-serif'
        } as Morph.TextNoteData
      })
    }
  }

  // ── render ─────────────────────────────────────────────────────────────

  if (!file) {
    return (
      <div className={styles.canvas}>
        <div className={styles.empty}>
          <button
            type="button"
            className={styles.emptyCta}
            onClick={openFilePicker}>
            <Icon icon="ant-design:folder-open-outlined" width={14} height={14} />
            打开 PDF
          </button>
          <p className={styles.emptyHint}>选择本地 PDF 开始浏览或批注</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.canvas}>
      <div className={styles.scroll}>
        <div
          className={styles.pageWrapper}
          style={{
            width: stageW,
            height: stageH,
            cursor: isCursorCrosshair ? 'crosshair' : 'default'
          }}>
          {isLoading && !pageImg ? (
            <div className={styles.placeholder}>
              <span className={styles.loadingDot} />
            </div>
          ) : null}

          <Stage
            width={stageW}
            height={stageH}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={cancelDraw}>
            <Layer>
              <PdfLayer
                pageImg={pageImg}
                width={stageW}
                height={stageH}
              />
            </Layer>
            <Layer>
              <AnnotationLayer
                annotations={pageAnnotations}
                stageW={stageW}
                stageH={stageH}
                selectedId={selectedId}
                onSelect={selectAnnotation}
              />
              <DraftLayer
                draft={draft}
                tool={activeTool}
              />
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  )
}
