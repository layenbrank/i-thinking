import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { message as antdMessage } from 'antd'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { parseRangesToIndexes } from '@/features/magnetic-tiles/morph/workspace/tasks/page-ranges'
import { MorphIpc } from '@/lib/morph-ipc'

// import {
//   countAnnotationsByPage,
//   insertAnnotation,
//   queryAnnotations,
//   removeAnnotation,
//   updateAnnotation,
//   upsertFile
// } from '@/databases/morph.ts'

type Tool = Morph.Tool
type ViewMode = Morph.ViewMode
type Annotation = Morph.Annotation
type PdfMeta = Morph.PdfMeta
type PageImage = Morph.PageImage
type SearchMatch = Morph.SearchMatch
type HistoryEntry = Morph.HistoryEntry

// ─── State shape ─────────────────────────────────────────────────────────────

interface MorphState {
  // File
  file: PdfMeta | null
  fileList: PdfMeta[]

  // View
  currentPage: number // 0-based
  zoom: number // 1.0 = 100 %
  activeTool: Tool
  viewMode: ViewMode
  summaryVisible: boolean
  /** Snapshot of summaryVisible when entering an operation; restored on exit. */
  summaryBeforeOperation: boolean | null
  isLoading: boolean

  // Rendered pages (cache: pageIndex → base64 data-URL)
  pageCache: Record<number, PageImage>
  thumbnails: PageImage[]
  /** 缩略图加载失败信息；成功或换文件时清空 */
  thumbnailsError: string | null

  // Annotations
  annotations: Annotation[]
  annotationCounts: Record<number, number> // pageIndex → count
  selectedAnnotationId: string | null

  // Search
  search: Morph.SearchState

  // Export
  exportState: Morph.ExportState

  // History
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]

  // Doc operations (edit-first; activeOperation drives UI, not a tools-app mode)
  activeOperation: Morph.Operation | null
  mergeModal: {
    inputs: string[]
    output: string
    loading: boolean
    error: string | null
  }
  splitModal: {
    mode: 'ranges' | 'count'
    ranges: string
    count: number
    destDir: string
    loading: boolean
    error: string | null
  }
  convertModal: {
    format: 'png' | 'jpg' | 'docx' | 'xlsx'
    scale: number
    destDir: string
    loading: boolean
    error: string | null
  }
  organizeModal: {
    /** 0-based working order */
    order: number[]
    selected: number[]
    dest: string
    loading: boolean
    error: string | null
  }
  extractModal: {
    selected: number[]
    dest: string
    loading: boolean
    error: string | null
  }

  // ── Actions ────────────────────────────────────────────────────────────

  openFilePicker: () => Promise<void>
  openFile: (path: string) => Promise<void>
  switchFile: (path: string) => Promise<void>
  closeFile: (path: string) => void
  setPage: (page: number) => void
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  fitWidth: () => void
  setTool: (tool: Tool) => void
  setViewMode: (mode: ViewMode) => void
  toggleSummary: () => void

  renderCurrentPage: () => Promise<void>
  loadThumbnails: () => Promise<void>

  searchText: (query: string) => Promise<void>
  clearSearch: () => void
  setSearchActiveIndex: (idx: number) => void

  addAnnotation: (
    partial: Omit<Annotation, 'id' | 'filePath' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>
  updateAnnotationData: (
    id: string,
    changes: Partial<Pick<Annotation, 'rect' | 'data'>>
  ) => Promise<void>
  removeAnnotationById: (id: string) => Promise<void>
  selectAnnotation: (id: string | null) => void

  setExportState: (patch: Partial<Morph.ExportState>) => void
  exportPdf: (destPath: string) => Promise<void>

  openOperation: (operation: Morph.Operation) => void
  closeOperation: () => void
  setMergeModal: (patch: Partial<MorphState['mergeModal']>) => void
  executeMerge: () => Promise<void>
  setSplitModal: (patch: Partial<MorphState['splitModal']>) => void
  executeSplit: () => Promise<void>
  setConvertModal: (patch: Partial<MorphState['convertModal']>) => void
  executeConvert: () => Promise<void>
  setOrganizeModal: (patch: Partial<MorphState['organizeModal']>) => void
  executeOrganize: (action: 'reorder' | 'rotate' | 'delete') => Promise<void>
  setExtractModal: (patch: Partial<MorphState['extractModal']>) => void
  executeExtract: () => Promise<void>

  /** @deprecated use openOperation('merge') */
  openMergeModal: () => void
  closeMergeModal: () => void
  /** @deprecated use openOperation('split') */
  openSplitModal: () => void
  closeSplitModal: () => void
  /** @deprecated use openOperation('convert') */
  openConvertModal: () => void
  closeConvertModal: () => void

  undo: () => Promise<void>
  redo: () => Promise<void>
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useMorphStore = create<MorphState>()(
  devtools(
    immer(function (setter, getter) {
      // ── helpers ─────────────────────────────────────────────────────

      // Suppressed during undo/redo to prevent re-recording the inverse action.
      let _suppressHistory = false

      function pushHistory(entry: HistoryEntry) {
        if (_suppressHistory) return
        setter((s) => {
          s.undoStack.push(entry)
          s.redoStack = []
        })
      }

      // ── initial state ────────────────────────────────────────────────

      const state: MorphState = {
        file: null,
        fileList: [],
        currentPage: 0,
        zoom: 1.0,
        activeTool: 'select',
        viewMode: 'view',
        summaryVisible: true,
        summaryBeforeOperation: null,
        isLoading: false,

        pageCache: {},
        thumbnails: [],
        thumbnailsError: null,

        annotations: [],
        annotationCounts: {},
        selectedAnnotationId: null,

        search: { query: '', results: [], activeIndex: -1 },
        exportState: { format: 'pdf', range: 'all', customRange: '' },

        undoStack: [],
        redoStack: [],

        activeOperation: null,
        mergeModal: { inputs: [], output: '', loading: false, error: null },
        splitModal: {
          mode: 'ranges',
          ranges: '',
          count: 2,
          destDir: '',
          loading: false,
          error: null
        },
        convertModal: {
          format: 'png',
          scale: 2.0,
          destDir: '',
          loading: false,
          error: null
        },
        organizeModal: {
          order: [],
          selected: [],
          dest: '',
          loading: false,
          error: null
        },
        extractModal: {
          selected: [],
          dest: '',
          loading: false,
          error: null
        },

        // ── file ─────────────────────────────────────────────────────

        async openFilePicker() {
          const selected = await dialogOpen({
            title: '打开 PDF 文件',
            filters: [{ name: 'PDF', extensions: ['pdf'] }],
            multiple: true
          })
          if (!selected) return
          const paths = Array.isArray(selected) ? selected : [selected]
          if (paths.length === 0) return
          // Activate the first file
          await getter().openFile(paths[0])
          // Add remaining files to list without switching
          for (let i = 1; i < paths.length; i++) {
            const path = paths[i]
            if (getter().fileList.some((f) => f.path === path)) continue
            try {
              const meta: PdfMeta = await MorphIpc.meta(path)
              // await upsertFile(meta)
              setter((s) => {
                if (!s.fileList.some((f) => f.path === path)) s.fileList.push(meta)
              })
            } catch (error) {
              console.log('error', error)
              // skip unreadable file
            }
          }
        },

        async openFile(path: string) {
          setter((s) => {
            s.isLoading = true
          })
          try {
            const meta: PdfMeta = await MorphIpc.meta(path)
            // await upsertFile(meta)

            // const annotations = await queryAnnotations(path)
            // const counts = await countAnnotationsByPage(path)

            setter((s) => {
              // Maintain fileList
              const idx = s.fileList.findIndex((f) => f.path === path)
              if (idx >= 0) s.fileList[idx] = meta
              else s.fileList.push(meta)

              s.file = meta
              s.currentPage = 0
              // s.annotations = annotations
              // s.annotationCounts = counts
              s.pageCache = {}
              s.thumbnails = []
              s.thumbnailsError = null
              s.undoStack = []
              s.redoStack = []
              s.selectedAnnotationId = null
              s.search = { query: '', results: [], activeIndex: -1 }
            })

            await getter().renderCurrentPage()
            // Load thumbnails in background
            void getter().loadThumbnails()
          } finally {
            setter((s) => {
              s.isLoading = false
            })
          }
        },

        async switchFile(path: string) {
          const { file, fileList } = getter()
          if (file?.path === path) return
          const target = fileList.find((f) => f.path === path)
          if (!target) return
          setter((s) => {
            s.isLoading = true
          })
          try {
            // const annotations = await queryAnnotations(path)
            // const counts = await countAnnotationsByPage(path)
            setter((s) => {
              s.file = target
              s.currentPage = 0
              // s.annotations = annotations
              // s.annotationCounts = counts
              s.pageCache = {}
              s.thumbnails = []
              s.thumbnailsError = null
              s.undoStack = []
              s.redoStack = []
              s.selectedAnnotationId = null
              s.search = { query: '', results: [], activeIndex: -1 }
            })
            await getter().renderCurrentPage()
            void getter().loadThumbnails()
          } finally {
            setter((s) => {
              s.isLoading = false
            })
          }
        },

        closeFile(path: string) {
          const { file, fileList } = getter()
          const remaining = fileList.filter((f) => f.path !== path)
          setter((s) => {
            s.fileList = remaining
          })
          if (file?.path !== path) return
          if (remaining.length > 0) {
            void getter().switchFile(remaining[remaining.length - 1].path)
          } else {
            setter((s) => {
              s.file = null
              s.currentPage = 0
              s.annotations = []
              s.annotationCounts = {}
              s.pageCache = {}
              s.thumbnails = []
              s.thumbnailsError = null
              s.undoStack = []
              s.redoStack = []
              s.selectedAnnotationId = null
              s.search = { query: '', results: [], activeIndex: -1 }
            })
          }
        },

        // ── view ─────────────────────────────────────────────────────

        setPage(page: number) {
          const { file, currentPage } = getter()
          if (!file) return
          const clamped = Math.max(0, Math.min(page, file.page_count - 1))
          if (clamped === currentPage) return
          setter((s) => {
            s.currentPage = clamped
          })
          void getter().renderCurrentPage()
        },

        setZoom(zoom: number) {
          const clamped = Math.max(0.25, Math.min(zoom, 5.0))
          setter((s) => {
            s.zoom = clamped
            s.pageCache = {} // clear cache at new zoom in one set() to avoid double re-render
          })
          void getter().renderCurrentPage()
        },

        zoomIn() {
          getter().setZoom(Math.round((getter().zoom + 0.25) * 4) / 4)
        },
        zoomOut() {
          getter().setZoom(Math.round((getter().zoom - 0.25) * 4) / 4)
        },
        fitWidth() {
          getter().setZoom(1.0)
        },

        setTool(tool: Tool) {
          setter((s) => {
            s.activeTool = tool
            // Switch to edit mode when a drawing tool is selected
            if (tool !== 'select') s.viewMode = 'edit'
          })
        },

        setViewMode(mode: ViewMode) {
          setter((s) => {
            s.viewMode = mode
          })
        },
        toggleSummary() {
          setter((s) => {
            s.summaryVisible = !s.summaryVisible
          })
        },

        // ── rendering ────────────────────────────────────────────────

        async renderCurrentPage() {
          const { file, currentPage, zoom } = getter()
          if (!file) return

          // Return cached version first
          if (getter().pageCache[currentPage]) return

          setter((s) => {
            s.isLoading = true
          })
          try {
            // Render at 2× the zoom factor for crisp display (device pixels)
            const scale = zoom * 2
            const image: PageImage = await MorphIpc.renderPage(file.path, currentPage, scale)
            setter((s) => {
              s.pageCache[currentPage] = image
            })
          } finally {
            setter((s) => {
              s.isLoading = false
            })
          }
        },

        async loadThumbnails() {
          const { file } = getter()
          if (!file) return
          setter((s) => {
            s.thumbnailsError = null
          })
          try {
            const thumbs: PageImage[] = await MorphIpc.renderThumbnails(file.path, 0.6)
            setter((s) => {
              s.thumbnails = thumbs
              s.thumbnailsError = null
            })
          } catch (e) {
            console.error('[morph] loadThumbnails failed:', e)
            setter((s) => {
              s.thumbnails = []
              s.thumbnailsError = String(e)
            })
          }
        },

        // ── search ────────────────────────────────────────────────────

        async searchText(query: string) {
          const { file } = getter()
          if (!file || !query.trim()) return
          const results: SearchMatch[] = await MorphIpc.search(file.path, query)
          setter((s) => {
            s.search.query = query
            s.search.results = results
            s.search.activeIndex = results.length > 0 ? 0 : -1
          })
          // Jump to first match page
          if (results.length > 0) {
            getter().setPage(results[0].page_index)
          }
        },

        clearSearch() {
          setter((s) => {
            s.search = { query: '', results: [], activeIndex: -1 }
          })
        },

        setSearchActiveIndex(idx: number) {
          const results = getter().search.results
          if (idx < 0 || idx >= results.length) return
          setter((s) => {
            s.search.activeIndex = idx
          })
          getter().setPage(results[idx].page_index)
        },

        // ── annotations ───────────────────────────────────────────────

        addAnnotation(partial) {
          const { file } = getter()
          if (!file) return Promise.resolve()

          const now = Date.now()
          const annotation: Annotation = {
            ...partial,
            id: crypto.randomUUID(),
            filePath: file.path,
            createdAt: now,
            updatedAt: now
          }

          // await insertAnnotation(annotation)

          setter((s) => {
            s.annotations.push(annotation)
            s.annotationCounts[annotation.pageIndex] =
              (s.annotationCounts[annotation.pageIndex] ?? 0) + 1
          })

          pushHistory({
            kind: 'ADD_ANNOTATION',
            label: `添加${annotation.type}批注`,
            timestamp: now,
            before: null,
            after: annotation
          })
          return Promise.resolve()
        },

        updateAnnotationData(id, changes) {
          const before = getter().annotations.find((a) => a.id === id) ?? null
          if (!before) return Promise.resolve()

          // await updateAnnotation(id, changes)

          const now = Date.now()
          setter((s) => {
            const idx = s.annotations.findIndex((a) => a.id === id)
            if (idx >= 0) {
              if (changes.rect) s.annotations[idx].rect = changes.rect
              if (changes.data) s.annotations[idx].data = changes.data
              s.annotations[idx].updatedAt = now
            }
          })

          pushHistory({
            kind: 'UPDATE_ANNOTATION',
            label: '编辑批注',
            timestamp: now,
            before,
            after: { ...before, ...changes, updatedAt: now }
          })
          return Promise.resolve()
        },

        removeAnnotationById(id) {
          const before = getter().annotations.find((a) => a.id === id) ?? null
          if (!before) return Promise.resolve()

          // await removeAnnotation(id)

          setter((s) => {
            s.annotations = s.annotations.filter((a) => a.id !== id)
            if (s.annotationCounts[before.pageIndex] > 0) {
              s.annotationCounts[before.pageIndex]--
            }
            if (s.selectedAnnotationId === id) s.selectedAnnotationId = null
          })

          pushHistory({
            kind: 'REMOVE_ANNOTATION',
            label: '删除批注',
            timestamp: Date.now(),
            before,
            after: null
          })
          return Promise.resolve()
        },

        selectAnnotation(id) {
          setter((s) => {
            s.selectedAnnotationId = id
          })
        },

        // ── export ────────────────────────────────────────────────────

        setExportState(patch) {
          setter((s) => {
            Object.assign(s.exportState, patch)
          })
        },

        async exportPdf(destPath: string) {
          const { file } = getter()
          if (!file) return
          await MorphIpc.export(file.path, destPath)
        },

        // ── doc operations ───────────────────────────────────────────

        openOperation(operation) {
          const { fileList, file, summaryVisible, summaryBeforeOperation } = getter()
          const pageCount = file?.page_count ?? 0
          const order = Array.from({ length: pageCount }, function (_, i) {
            return i
          })

          setter((s) => {
            if (summaryBeforeOperation === null) {
              s.summaryBeforeOperation = summaryVisible
            }
            s.summaryVisible = false
            s.activeOperation = operation
            if (operation === 'merge') {
              s.mergeModal.inputs = fileList.map(function (f) {
                return f.path
              })
              s.mergeModal.output = ''
              s.mergeModal.error = null
            } else if (operation === 'split') {
              s.splitModal.ranges = ''
              s.splitModal.count = 2
              s.splitModal.error = null
            } else if (operation === 'convert') {
              s.convertModal.error = null
            } else if (operation === 'organize') {
              s.organizeModal.order = order
              s.organizeModal.selected = []
              s.organizeModal.dest = ''
              s.organizeModal.error = null
            } else if (operation === 'extract') {
              s.extractModal.selected = []
              s.extractModal.dest = ''
              s.extractModal.error = null
            }
          })

          if (
            (operation === 'split' ||
              operation === 'convert' ||
              operation === 'organize' ||
              operation === 'extract') &&
            file &&
            getter().thumbnails.length === 0
          ) {
            void getter().loadThumbnails()
          }
        },

        closeOperation() {
          setter((s) => {
            s.activeOperation = null
            if (s.summaryBeforeOperation !== null) {
              s.summaryVisible = s.summaryBeforeOperation
              s.summaryBeforeOperation = null
            }
          })
        },

        openMergeModal() {
          getter().openOperation('merge')
        },
        closeMergeModal() {
          getter().closeOperation()
        },
        setMergeModal(patch) {
          setter((s) => {
            Object.assign(s.mergeModal, patch)
          })
        },
        async executeMerge() {
          const { mergeModal } = getter()
          setter((s) => {
            s.mergeModal.loading = true
            s.mergeModal.error = null
          })
          try {
            await MorphIpc.merge(mergeModal.inputs, mergeModal.output)
            antdMessage.success(`合并完成 → ${mergeModal.output}`)
            getter().closeOperation()
          } catch (e) {
            const msg = String(e)
            setter((s) => {
              s.mergeModal.error = msg
            })
            antdMessage.error(`合并失败：${msg}`)
          } finally {
            setter((s) => {
              s.mergeModal.loading = false
            })
          }
        },

        openSplitModal() {
          getter().openOperation('split')
        },
        closeSplitModal() {
          getter().closeOperation()
        },
        setSplitModal(patch) {
          setter((s) => {
            Object.assign(s.splitModal, patch)
          })
        },
        async executeSplit() {
          const { splitModal, file } = getter()
          if (!file) return
          setter((s) => {
            s.splitModal.loading = true
            s.splitModal.error = null
          })
          try {
            if (splitModal.mode === 'ranges') {
              const pageCount = file.page_count
              const indexes = parseRangesToIndexes(splitModal.ranges, pageCount)
              if (!indexes.length) {
                throw new Error('请输入有效页码范围（不超过总页数）')
              }
              // 将 clamp 后的 0-based 索引还原为 1-based range 字符串再交 IPC
              const rangeParts = splitModal.ranges
                .split(/[,;\n]+/)
                .map(function (part) {
                  return part.trim()
                })
                .filter(Boolean)
                .map(function (part) {
                  const bits = part.split('-').map(Number)
                  const start = bits[0]
                  const end = bits[1] ?? start
                  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
                  const from = Math.max(1, Math.min(start, end))
                  const to = Math.min(pageCount, Math.max(start, end))
                  if (from > pageCount || to < 1) return null
                  return `${from}-${to}`
                })
                .filter(function (part): part is string {
                  return part !== null
                })
              if (!rangeParts.length) {
                throw new Error('请输入有效页码范围（不超过总页数）')
              }
              const paths: string[] = await MorphIpc.split(
                file.path,
                rangeParts,
                splitModal.destDir
              )
              antdMessage.success(`拆分完成，已生成 ${paths.length} 个文件 → ${splitModal.destDir}`)
            } else {
              if (splitModal.count <= 0) {
                throw new Error('每文件页数须大于 0')
              }
              const paths: string[] = await MorphIpc.splitByCount(
                file.path,
                splitModal.count,
                splitModal.destDir
              )
              antdMessage.success(`拆分完成，已生成 ${paths.length} 个文件 → ${splitModal.destDir}`)
            }
            getter().closeOperation()
          } catch (e) {
            const msg = String(e)
            setter((s) => {
              s.splitModal.error = msg
            })
            antdMessage.error(`拆分失败：${msg}`)
          } finally {
            setter((s) => {
              s.splitModal.loading = false
            })
          }
        },

        openConvertModal() {
          getter().openOperation('convert')
        },
        closeConvertModal() {
          getter().closeOperation()
        },
        setConvertModal(patch) {
          setter((s) => {
            Object.assign(s.convertModal, patch)
          })
        },
        async executeConvert() {
          const { convertModal, file } = getter()
          if (!file) return
          setter((s) => {
            s.convertModal.loading = true
            s.convertModal.error = null
          })
          try {
            if (convertModal.format === 'png' || convertModal.format === 'jpg') {
              const paths: string[] = await MorphIpc.toImages(
                file.path,
                convertModal.scale,
                convertModal.format,
                convertModal.destDir
              )
              antdMessage.success(
                `转换完成，已生成 ${paths.length} 张图片 → ${convertModal.destDir}`
              )
            } else {
              const outPath: string = await MorphIpc.toOffice(
                file.path,
                convertModal.format,
                convertModal.destDir
              )
              antdMessage.success(`转换完成 → ${outPath}`)
            }
            getter().closeOperation()
          } catch (e) {
            const msg = String(e)
            setter((s) => {
              s.convertModal.error = msg
            })
            antdMessage.error(`转换失败：${msg}`)
          } finally {
            setter((s) => {
              s.convertModal.loading = false
            })
          }
        },

        setOrganizeModal(patch) {
          setter((s) => {
            Object.assign(s.organizeModal, patch)
          })
        },
        async executeOrganize(action) {
          const { organizeModal, file } = getter()
          if (!file) return
          if (!organizeModal.dest) {
            antdMessage.warning('请先选择输出路径')
            return
          }
          setter((s) => {
            s.organizeModal.loading = true
            s.organizeModal.error = null
          })
          try {
            let outPath = organizeModal.dest
            if (action === 'reorder') {
              outPath = await MorphIpc.reorderPages(
                file.path,
                organizeModal.order,
                organizeModal.dest
              )
            } else if (action === 'rotate') {
              if (!organizeModal.selected.length) {
                throw new Error('请先选择要旋转的页面')
              }
              outPath = await MorphIpc.rotatePages(
                file.path,
                organizeModal.selected,
                90,
                organizeModal.dest
              )
            } else if (action === 'delete') {
              if (!organizeModal.selected.length) {
                throw new Error('请先选择要删除的页面')
              }
              outPath = await MorphIpc.deletePages(
                file.path,
                organizeModal.selected,
                organizeModal.dest
              )
            }
            antdMessage.success(`整理完成 → ${outPath}`)
            getter().closeOperation()
            await getter().openFile(outPath)
          } catch (e) {
            const msg = String(e)
            setter((s) => {
              s.organizeModal.error = msg
            })
            antdMessage.error(`整理失败：${msg}`)
          } finally {
            setter((s) => {
              s.organizeModal.loading = false
            })
          }
        },

        setExtractModal(patch) {
          setter((s) => {
            Object.assign(s.extractModal, patch)
          })
        },
        async executeExtract() {
          const { extractModal, file } = getter()
          if (!file) return
          if (!extractModal.selected.length) {
            antdMessage.warning('请先选择要抽取的页面')
            return
          }
          if (!extractModal.dest) {
            antdMessage.warning('请先选择输出路径')
            return
          }
          setter((s) => {
            s.extractModal.loading = true
            s.extractModal.error = null
          })
          try {
            const outPath = await MorphIpc.extractPages(
              file.path,
              extractModal.selected,
              extractModal.dest
            )
            antdMessage.success(`抽取完成 → ${outPath}`)
            getter().closeOperation()
          } catch (e) {
            const msg = String(e)
            setter((s) => {
              s.extractModal.error = msg
            })
            antdMessage.error(`抽取失败：${msg}`)
          } finally {
            setter((s) => {
              s.extractModal.loading = false
            })
          }
        },

        // ── history ───────────────────────────────────────────────────

        async undo() {
          const { undoStack } = getter()
          if (!undoStack.length) return
          const entry = undoStack[undoStack.length - 1]

          setter((s) => {
            s.undoStack.pop()
            s.redoStack.push(entry)
          })

          _suppressHistory = true
          try {
            const store = getter()
            if (entry.kind === 'ADD_ANNOTATION' && entry.after) {
              await store.removeAnnotationById(entry.after.id)
            } else if (entry.kind === 'REMOVE_ANNOTATION' && entry.before) {
              await store.addAnnotation(entry.before)
            } else if (entry.kind === 'UPDATE_ANNOTATION' && entry.before) {
              await store.updateAnnotationData(entry.before.id, {
                rect: entry.before.rect,
                data: entry.before.data
              })
            }
          } finally {
            _suppressHistory = false
          }
        },

        async redo() {
          const { redoStack } = getter()
          if (!redoStack.length) return
          const entry = redoStack[redoStack.length - 1]

          setter((s) => {
            s.redoStack.pop()
            s.undoStack.push(entry)
          })

          _suppressHistory = true
          try {
            const store = getter()
            if (entry.kind === 'ADD_ANNOTATION' && entry.after) {
              await store.addAnnotation(entry.after)
            } else if (entry.kind === 'REMOVE_ANNOTATION' && entry.after) {
              await store.removeAnnotationById(entry.after.id)
            } else if (entry.kind === 'UPDATE_ANNOTATION' && entry.after) {
              await store.updateAnnotationData(entry.after.id, {
                rect: entry.after.rect,
                data: entry.after.data
              })
            }
          } finally {
            _suppressHistory = false
          }
        }
      }

      return state
    }),
    { name: 'morph' }
  )
)

// ── Derived selectors (for convenience) ──────────────────────────────────────

export const selectCurrentPageAnnotations = (state: MorphState) =>
  state.annotations.filter((a) => a.pageIndex === state.currentPage)

export const selectSelectedAnnotation = (state: MorphState) =>
  state.annotations.find((a) => a.id === state.selectedAnnotationId) ?? null
