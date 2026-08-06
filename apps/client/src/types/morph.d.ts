/**
 * Morph 领域类型（与 corex morph schema / MorphIpc 对齐）
 *
 * 字段约定：
 * - count  总页数
 * - limit  每文件页数等上限
 * - offset 0-based 页序号
 * - dir    输出目录
 * - base64 位图载荷（无 data: 前缀）
 *
 * 尺寸勿混用：
 * - Meta.width/height     PDF 页（点）
 * - Render.width/height   位图像素
 * - Hit.width/height      命中框（页坐标）
 * - Rect.w/h              归一化 0–1
 */
declare global {
  namespace Morph {
    type Tool = 'select' | 'text' | 'highlight' | 'shape' | 'stamp' | 'crop' | 'rotate'
    type ViewMode = 'view' | 'edit'
    /** 文档级操作（工具栏发起） */
    type Operation = 'merge' | 'split' | 'convert' | 'organize' | 'extract'
    type AnnKind = 'highlight' | 'shape' | 'stamp' | 'text-note'
    type ShapeKind = 'rect' | 'ellipse' | 'line' | 'arrow'
    type ExportFormat = 'pdf' | 'pdf-a' | 'png'
    type ExportRange = 'all' | 'current' | 'custom'
    /** seekOffset 来源 */
    type SeekSource = 'toolbar' | 'scroll' | 'thumb'
    type HistoryKind = 'ADD_ANNOTATION' | 'UPDATE_ANNOTATION' | 'REMOVE_ANNOTATION'

    /** 文档元信息（toMeta） */
    interface Meta {
      path: string
      title: string
      author: string
      /** 总页数 */
      count: number
      /** 默认页宽（点） */
      width: number
      /** 默认页高（点） */
      height: number
    }

    /** 单页渲染位图（toRender / toThumbnails） */
    interface Render {
      /** 0-based 页序号 */
      offset: number
      /** 位图像素宽 */
      width: number
      /** 位图像素高 */
      height: number
      base64: string
    }

    /** 全文搜索命中（toMatch → Hit） */
    interface Hit {
      /** 0-based 页序号 */
      offset: number
      x: number
      y: number
      width: number
      height: number
      snippet: string
    }

    /** 批注矩形（归一化 0–1，相对页宽高） */
    interface Rect {
      x: number
      y: number
      w: number
      h: number
    }

    interface Highlight {
      color: string
      opacity: number
    }

    interface Shape {
      kind: ShapeKind
      stroke: string
      fill: string
      strokeWidth: number
      opacity: number
    }

    interface Stamp {
      label: string
      color: string
    }

    interface TextNote {
      content: string
      fontSize: number
      color: string
      fontFamily: string
    }

    type AnnData = Highlight | Shape | Stamp | TextNote

    interface Annotation {
      id: string
      path: string
      /** 0-based 页序号 */
      offset: number
      type: AnnKind
      rect: Rect
      data: AnnData
      createdAt: number
      updatedAt: number
    }

    interface HistoryEntry {
      kind: HistoryKind
      label: string
      timestamp: number
      before: Annotation | null
      after: Annotation | null
    }

    interface SearchState {
      query: string
      results: Hit[]
      /** results 下标；无命中为 -1 */
      active: number
    }

    interface ExportState {
      format: ExportFormat
      range: ExportRange
      customRange: string
    }
  }
}

export {}
