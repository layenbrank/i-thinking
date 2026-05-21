declare namespace Morph {
  type Tool = 'select' | 'text' | 'highlight' | 'shape' | 'stamp' | 'crop' | 'rotate'
  type ViewMode = 'view' | 'edit'
  type AnnotationType = 'highlight' | 'shape' | 'stamp' | 'text-note'
  type ShapeKind = 'rect' | 'ellipse' | 'line' | 'arrow'
  type ExportFormat = 'pdf' | 'pdf-a' | 'png'
  type ExportRange = 'all' | 'current' | 'custom'

  // ── Rust command return types ──────────────────────────────────────────

  interface PdfMeta {
    path: string
    title: string
    author: string
    page_count: number
    page_width: number
    page_height: number
  }

  interface PageImage {
    data_base64: string
    width: number
    height: number
    page_index: number
  }

  interface SearchMatch {
    page_index: number
    x: number
    y: number
    width: number
    height: number
    snippet: string
  }

  // ── Annotation rect in PDF user-space ─────────────────────────────────
  // Coordinates are normalized (0–1) relative to page width/height.

  interface NormalizedRect {
    x: number
    y: number
    w: number
    h: number
  }

  // ── Annotation payloads ───────────────────────────────────────────────

  interface HighlightData {
    color: string // hex, e.g. '#FFE066'
    opacity: number // 0–1
  }

  interface ShapeData {
    kind: ShapeKind
    stroke: string // hex
    fill: string // hex or 'none'
    strokeWidth: number
    opacity: number
  }

  interface StampData {
    label: string // e.g. '已签署', '草稿'
    color: string
  }

  interface TextNoteData {
    content: string
    fontSize: number
    color: string
    fontFamily: string
  }

  // ── Unified annotation record ─────────────────────────────────────────

  interface Annotation {
    id: string
    filePath: string
    pageIndex: number
    type: AnnotationType
    rect: NormalizedRect
    data: HighlightData | ShapeData | StampData | TextNoteData
    createdAt: number
    updatedAt: number
  }

  // ── History ────────────────────────────────────────────────────────────

  type HistoryActionKind = 'ADD_ANNOTATION' | 'UPDATE_ANNOTATION' | 'REMOVE_ANNOTATION'

  interface HistoryEntry {
    kind: HistoryActionKind
    label: string
    timestamp: number
    before: Annotation | null
    after: Annotation | null
  }

  // ── Store state shape (used by morph store) ───────────────────────────

  interface SearchState {
    query: string
    results: SearchMatch[]
    activeIndex: number
  }

  interface ExportState {
    format: ExportFormat
    range: ExportRange
    customRange: string // e.g. '1-3,5'
  }
}
