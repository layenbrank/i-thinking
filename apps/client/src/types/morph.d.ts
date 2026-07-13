/**
 * morph 类型（对齐 corex morph/schema 与 UI store）
 */
declare global {
  namespace Morph {
    type Tool = 'select' | 'text' | 'highlight' | 'shape' | 'stamp' | 'crop' | 'rotate'
    type ViewMode = 'view' | 'edit'
    type AnnotationType = 'highlight' | 'shape' | 'stamp' | 'text-note'
    type ShapeKind = 'rect' | 'ellipse' | 'line' | 'arrow'
    type ExportFormat = 'pdf' | 'pdf-a' | 'png'
    type ExportRange = 'all' | 'current' | 'custom'

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

    interface NormalizedRect {
      x: number
      y: number
      w: number
      h: number
    }

    interface HighlightData {
      color: string
      opacity: number
    }

    interface ShapeData {
      kind: ShapeKind
      stroke: string
      fill: string
      strokeWidth: number
      opacity: number
    }

    interface StampData {
      label: string
      color: string
    }

    interface TextNoteData {
      content: string
      fontSize: number
      color: string
      fontFamily: string
    }

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

    type HistoryActionKind = 'ADD_ANNOTATION' | 'UPDATE_ANNOTATION' | 'REMOVE_ANNOTATION'

    interface HistoryEntry {
      kind: HistoryActionKind
      label: string
      timestamp: number
      before: Annotation | null
      after: Annotation | null
    }

    interface SearchState {
      query: string
      results: SearchMatch[]
      activeIndex: number
    }

    interface ExportState {
      format: ExportFormat
      range: ExportRange
      customRange: string
    }
  }
}

export {}
