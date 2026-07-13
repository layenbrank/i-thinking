import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { message as antdMessage } from 'antd'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

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
  isLoading: boolean

  // Rendered pages (cache: pageIndex → base64 data-URL)
  pageCache: Record<number, PageImage>
  thumbnails: PageImage[]

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

  // Doc operation modals
  mergeModal: {
    open: boolean
    inputs: string[]
    output: string
    loading: boolean
    error: string | null
  }
  splitModal: {
    open: boolean
    mode: 'ranges' | 'count'
    ranges: string
    count: number
    destDir: string
    loading: boolean
    error: string | null
  }
  convertModal: {
    open: boolean
    format: 'png' | 'jpg' | 'docx' | 'xlsx'
    scale: number
    destDir: string
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

  // Doc operation modals
  openMergeModal: () => void
  closeMergeModal: () => void
  setMergeModal: (patch: Partial<MorphState['mergeModal']>) => void
  executeMerge: () => Promise<void>
  openSplitModal: () => void
  closeSplitModal: () => void
  setSplitModal: (patch: Partial<MorphState['splitModal']>) => void
  executeSplit: () => Promise<void>
  openConvertModal: () => void
  closeConvertModal: () => void
  setConvertModal: (patch: Partial<MorphState['convertModal']>) => void
  executeConvert: () => Promise<void>

  undo: () => void
  redo: () => void
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
        isLoading: false,

        pageCache: {},
        thumbnails: [],

        annotations: [],
        annotationCounts: {},
        selectedAnnotationId: null,

        search: { query: '', results: [], activeIndex: -1 },
        exportState: { format: 'pdf', range: 'all', customRange: '' },

        undoStack: [],
        redoStack: [],

        mergeModal: { open: false, inputs: [], output: '', loading: false, error: null },
        splitModal: {
          open: false,
          mode: 'ranges',
          ranges: '',
          count: 2,
          destDir: '',
          loading: false,
          error: null
        },
        convertModal: {
          open: false,
          format: 'png',
          scale: 2.0,
          destDir: '',
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
              s.undoStack = []
              s.redoStack = []
              s.selectedAnnotationId = null
              s.search = { query: '', results: [], activeIndex: -1 }
            })

            await getter().renderCurrentPage()
            // Load thumbnails in background
            getter().loadThumbnails()
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
              s.undoStack = []
              s.redoStack = []
              s.selectedAnnotationId = null
              s.search = { query: '', results: [], activeIndex: -1 }
            })
            await getter().renderCurrentPage()
            getter().loadThumbnails()
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
          getter().renderCurrentPage()
        },

        setZoom(zoom: number) {
          const clamped = Math.max(0.25, Math.min(zoom, 5.0))
          setter((s) => {
            s.zoom = clamped
            s.pageCache = {} // clear cache at new zoom in one set() to avoid double re-render
          })
          getter().renderCurrentPage()
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
          try {
            const thumbs: PageImage[] = await MorphIpc.renderThumbnails(file.path, 0.6)
            setter((s) => {
              s.thumbnails = thumbs
            })
          } catch (e) {
            console.error('[morph] loadThumbnails failed:', e)
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

        async addAnnotation(partial) {
          const { file } = getter()
          if (!file) return

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
        },

        async updateAnnotationData(id, changes) {
          const before = getter().annotations.find((a) => a.id === id) ?? null
          if (!before) return

          // await updateAnnotation(id, changes)

          const now = Date.now()
          setter((s) => {
            const idx = s.annotations.findIndex((a) => a.id === id)
            if (idx >= 0) {
              if (changes.rect) s.annotations[idx].rect = changes.rect
              if (changes.data) s.annotations[idx].data = changes.data as Annotation['data']
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
        },

        async removeAnnotationById(id) {
          const before = getter().annotations.find((a) => a.id === id) ?? null
          if (!before) return

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

        // ── doc operation modals ─────────────────────────────────────

        openMergeModal() {
          const { fileList } = getter()
          setter((s) => {
            s.mergeModal.open = true
            s.mergeModal.inputs = fileList.map((f) => f.path)
            s.mergeModal.output = ''
            s.mergeModal.error = null
          })
        },
        closeMergeModal() {
          setter((s) => {
            s.mergeModal.open = false
          })
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
            setter((s) => {
              s.mergeModal.open = false
            })
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
          setter((s) => {
            s.splitModal.open = true
            s.splitModal.ranges = ''
            s.splitModal.count = 2
            s.splitModal.error = null
          })
        },
        closeSplitModal() {
          setter((s) => {
            s.splitModal.open = false
          })
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
              const ranges = splitModal.ranges
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s) => {
                  const [a, b] = s.split('-').map(Number)
                  return [a, b ?? a] as [number, number]
                })
                .filter(([a, b]) => !isNaN(a) && !isNaN(b) && a > 0 && b > 0)
              const rangeStrings = ranges.map(function ([a, b]) {
                return `${a}-${b}`
              })
              const paths: string[] = await MorphIpc.split(
                file.path,
                rangeStrings,
                splitModal.destDir
              )
              antdMessage.success(`拆分完成，已生成 ${paths.length} 个文件 → ${splitModal.destDir}`)
            } else {
              const paths: string[] = await MorphIpc.splitByCount(
                file.path,
                splitModal.count,
                splitModal.destDir
              )
              antdMessage.success(`拆分完成，已生成 ${paths.length} 个文件 → ${splitModal.destDir}`)
            }
            setter((s) => {
              s.splitModal.open = false
            })
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
          setter((s) => {
            s.convertModal.open = true
            s.convertModal.error = null
          })
        },
        closeConvertModal() {
          setter((s) => {
            s.convertModal.open = false
          })
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
            setter((s) => {
              s.convertModal.open = false
            })
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
