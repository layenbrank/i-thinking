import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { message as antdMessage } from 'antd'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { parseRangesToOffsets } from '@/features/magnetic-tiles/morph/workspace/tasks/page-ranges'
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
type Meta = Morph.Meta
type Render = Morph.Render
type Hit = Morph.Hit
type HistoryEntry = Morph.HistoryEntry

// ─── State shape ─────────────────────────────────────────────────────────────

interface MorphState {
  // File
  file: Meta | null
  files: Meta[]

  // View
  offset: number // 0-based
  /** 最近一次切页来源；canvas 用其决定是否 scrollIntoView */
  seekSource: Morph.SeekSource | null
  zoom: number // 1.0 = 100 %
  activeTool: Tool
  viewMode: ViewMode
  summaryVisible: boolean
  /** Snapshot of summaryVisible when entering an operation; restored on exit. */
  summaryBeforeOperation: boolean | null
  isLoading: boolean

  // Rendered pages (cache: offset → Render)
  renders: Record<number, Render>
  thumbnails: Render[]
  /** 缩略图加载失败信息；成功或换文件时清空 */
  thumbnailsError: string | null

  // Annotations
  annotations: Annotation[]
  annCounts: Record<number, number> // offset → count
  selectedId: string | null

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
    mode: 'ranges' | 'limit'
    ranges: string
    /** 每文件页数（split-by-count） */
    limit: number
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
  seekOffset: (offset: number, opts?: { source?: Morph.SeekSource }) => void
  zoomTo: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  fitWidth: () => void
  pickTool: (tool: Tool) => void
  switchView: (mode: ViewMode) => void
  toggleSummary: () => void

  fetchRender: (offset: number) => Promise<void>
  fetchCurrent: () => Promise<void>
  warmOffsets: (offsets: number[]) => Promise<void>
  fetchThumbnails: () => Promise<void>

  matchText: (query: string) => Promise<void>
  clearSearch: () => void
  seekMatch: (idx: number) => void

  addAnnotation: (
    partial: Omit<Annotation, 'id' | 'path' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>
  patchAnnotation: (
    id: string,
    changes: Partial<Pick<Annotation, 'rect' | 'data'>>
  ) => Promise<void>
  removeAnnotation: (id: string) => Promise<void>
  selectAnnotation: (id: string | null) => void

  patchExport: (patch: Partial<Morph.ExportState>) => void
  exportDoc: (destPath: string) => Promise<void>

  openOperation: (operation: Morph.Operation) => void
  closeOperation: () => void
  patchMerge: (patch: Partial<MorphState['mergeModal']>) => void
  executeMerge: () => Promise<void>
  patchSplit: (patch: Partial<MorphState['splitModal']>) => void
  executeSplit: () => Promise<void>
  patchConvert: (patch: Partial<MorphState['convertModal']>) => void
  executeConvert: () => Promise<void>
  patchOrganize: (patch: Partial<MorphState['organizeModal']>) => void
  executeOrganize: (action: 'reorder' | 'rotate' | 'delete') => Promise<void>
  patchExtract: (patch: Partial<MorphState['extractModal']>) => void
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

const useMorphStore = create<MorphState>()(
  devtools(
    immer(function (setter, getter) {
      // ── helpers ─────────────────────────────────────────────────────

      // Suppressed during undo/redo to prevent re-recording the inverse action.
      let _suppressHistory = false
      /** In-flight page renders (avoid duplicate IPC) */
      const pending = new Set<number>()
      const RENDER_CONCURRENCY = 2

      function pushHistory(entry: HistoryEntry) {
        if (_suppressHistory) return
        setter((s) => {
          s.undoStack.push(entry)
          s.redoStack = []
        })
      }

      function nearOffsets(offset: number, count: number): number[] {
        const indexes: number[] = []
        for (let i = offset - 1; i <= offset + 1; i++) {
          if (i >= 0 && i < count) indexes.push(i)
        }
        return indexes
      }

      // ── initial state ────────────────────────────────────────────────

      const state: MorphState = {
        file: null,
        files: [],
        offset: 0,
        seekSource: null,
        zoom: 1.0,
        activeTool: 'select',
        viewMode: 'view',
        summaryVisible: true,
        summaryBeforeOperation: null,
        isLoading: false,

        renders: {},
        thumbnails: [],
        thumbnailsError: null,

        annotations: [],
        annCounts: {},
        selectedId: null,

        search: { query: '', results: [], active: -1 },
        exportState: { format: 'pdf', range: 'all', customRange: '' },

        undoStack: [],
        redoStack: [],

        activeOperation: null,
        mergeModal: { inputs: [], output: '', loading: false, error: null },
        splitModal: {
          mode: 'ranges',
          ranges: '',
          limit: 2,
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
            if (getter().files.some((f) => f.path === path)) continue
            try {
              const meta: Meta = await MorphIpc.toMeta(path)
              // await upsertFile(meta)
              setter((s) => {
                if (!s.files.some((f) => f.path === path)) s.files.push(meta)
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
            const meta: Meta = await MorphIpc.toMeta(path)
            // await upsertFile(meta)

            // const annotations = await queryAnnotations(path)
            // const counts = await countAnnotationsByPage(path)

            setter((s) => {
              // Maintain files
              const idx = s.files.findIndex((f) => f.path === path)
              if (idx >= 0) s.files[idx] = meta
              else s.files.push(meta)

              s.file = meta
              s.offset = 0
              s.seekSource = null
              // s.annotations = annotations
              // s.annCounts = counts
              s.renders = {}
              s.thumbnails = []
              s.thumbnailsError = null
              s.undoStack = []
              s.redoStack = []
              s.selectedId = null
              s.search = { query: '', results: [], active: -1 }
            })

            await getter().warmOffsets(nearOffsets(0, meta.count))
            // Load thumbnails in background
            void getter().fetchThumbnails()
          } finally {
            setter((s) => {
              s.isLoading = false
            })
          }
        },

        async switchFile(path: string) {
          const { file, files } = getter()
          if (file?.path === path) return
          const target = files.find((f) => f.path === path)
          if (!target) return
          setter((s) => {
            s.isLoading = true
          })
          try {
            // const annotations = await queryAnnotations(path)
            // const counts = await countAnnotationsByPage(path)
            setter((s) => {
              s.file = target
              s.offset = 0
              s.seekSource = null
              // s.annotations = annotations
              // s.annCounts = counts
              s.renders = {}
              s.thumbnails = []
              s.thumbnailsError = null
              s.undoStack = []
              s.redoStack = []
              s.selectedId = null
              s.search = { query: '', results: [], active: -1 }
            })
            await getter().warmOffsets(nearOffsets(0, target.count))
            void getter().fetchThumbnails()
          } finally {
            setter((s) => {
              s.isLoading = false
            })
          }
        },

        closeFile(path: string) {
          const { file, files } = getter()
          const remaining = files.filter((f) => f.path !== path)
          setter((s) => {
            s.files = remaining
          })
          if (file?.path !== path) return
          if (remaining.length > 0) {
            void getter().switchFile(remaining[remaining.length - 1].path)
          } else {
            setter((s) => {
              s.file = null
              s.offset = 0
              s.annotations = []
              s.annCounts = {}
              s.renders = {}
              s.thumbnails = []
              s.thumbnailsError = null
              s.undoStack = []
              s.redoStack = []
              s.selectedId = null
              s.search = { query: '', results: [], active: -1 }
            })
          }
        },

        // ── view ─────────────────────────────────────────────────────

        seekOffset(offset: number, opts?: { source?: Morph.SeekSource }) {
          const source = opts?.source ?? 'toolbar'
          const { file, offset: current } = getter()
          if (!file) return
          const clamped = Math.max(0, Math.min(offset, file.count - 1))
          if (clamped === current) {
            if (source !== 'scroll') {
              setter((s) => {
                s.seekSource = source
              })
            }
            return
          }
          setter((s) => {
            s.offset = clamped
            s.seekSource = source
          })
          if (source !== 'scroll') {
            void getter().warmOffsets(nearOffsets(clamped, file.count))
          }
        },

        zoomTo(zoom: number) {
          const clamped = Math.max(0.25, Math.min(zoom, 5.0))
          const { offset, file } = getter()
          setter((s) => {
            s.zoom = clamped
            s.renders = {} // clear cache at new zoom in one set() to avoid double re-render
          })
          pending.clear()
          if (file) {
            void getter().warmOffsets(nearOffsets(offset, file.count))
          }
        },

        zoomIn() {
          getter().zoomTo(Math.round((getter().zoom + 0.25) * 4) / 4)
        },
        zoomOut() {
          getter().zoomTo(Math.round((getter().zoom - 0.25) * 4) / 4)
        },
        fitWidth() {
          getter().zoomTo(1.0)
        },

        pickTool(tool: Tool) {
          setter((s) => {
            s.activeTool = tool
            // Switch to edit mode when a drawing tool is selected
            if (tool !== 'select') s.viewMode = 'edit'
          })
        },

        switchView(mode: ViewMode) {
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

        async fetchRender(offset: number) {
          const { file, zoom, renders } = getter()
          if (!file) return
          if (offset < 0 || offset >= file.count) return
          if (renders[offset]) return
          if (pending.has(offset)) return

          pending.add(offset)
          const path = file.path
          const scale = zoom * 2
          try {
            // 以 zoom×2 渲染保证清晰；画布 CSS 尺寸在 canvas 中 ÷2
            const image: Render = await MorphIpc.toRender(path, offset, scale)
            const latest = getter()
            if (latest.file?.path !== path || latest.zoom !== zoom) return
            setter((s) => {
              s.renders[offset] = image
            })
          } catch (e) {
            console.error('[morph] fetchRender failed:', e)
          } finally {
            pending.delete(offset)
          }
        },

        async fetchCurrent() {
          await getter().fetchRender(getter().offset)
        },

        async warmOffsets(offsets: number[]) {
          const { file, renders } = getter()
          if (!file) return
          const unique = [...new Set(offsets)].filter(function (i) {
            return i >= 0 && i < file.count && !renders[i] && !pending.has(i)
          })
          if (!unique.length) return

          let cursor = 0
          async function worker() {
            while (cursor < unique.length) {
              const index = unique[cursor++]
              await getter().fetchRender(index)
            }
          }

          const workers = Array.from(
            { length: Math.min(RENDER_CONCURRENCY, unique.length) },
            function () {
              return worker()
            }
          )
          await Promise.all(workers)
        },

        async fetchThumbnails() {
          const { file } = getter()
          if (!file) return
          setter((s) => {
            s.thumbnailsError = null
          })
          try {
            const thumbs: Render[] = await MorphIpc.toThumbnails(file.path, 0.6)
            setter((s) => {
              s.thumbnails = thumbs
              s.thumbnailsError = null
            })
          } catch (e) {
            console.error('[morph] fetchThumbnails failed:', e)
            setter((s) => {
              s.thumbnails = []
              s.thumbnailsError = String(e)
            })
          }
        },

        // ── search ────────────────────────────────────────────────────

        async matchText(query: string) {
          const { file } = getter()
          if (!file || !query.trim()) return
          const results: Hit[] = await MorphIpc.toMatch(file.path, query)
          setter((s) => {
            s.search.query = query
            s.search.results = results
            s.search.active = results.length > 0 ? 0 : -1
          })
          // Jump to first match page
          if (results.length > 0) {
            getter().seekOffset(results[0].offset, { source: 'toolbar' })
          }
        },

        clearSearch() {
          setter((s) => {
            s.search = { query: '', results: [], active: -1 }
          })
        },

        seekMatch(idx: number) {
          const results = getter().search.results
          if (idx < 0 || idx >= results.length) return
          setter((s) => {
            s.search.active = idx
          })
          getter().seekOffset(results[idx].offset, { source: 'toolbar' })
        },

        // ── annotations ───────────────────────────────────────────────

        addAnnotation(partial) {
          const { file } = getter()
          if (!file) return Promise.resolve()

          const now = Date.now()
          const annotation: Annotation = {
            ...partial,
            id: crypto.randomUUID(),
            path: file.path,
            createdAt: now,
            updatedAt: now
          }

          // await insertAnnotation(annotation)

          setter((s) => {
            s.annotations.push(annotation)
            s.annCounts[annotation.offset] =
              (s.annCounts[annotation.offset] ?? 0) + 1
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

        patchAnnotation(id, changes) {
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

        removeAnnotation(id) {
          const before = getter().annotations.find((a) => a.id === id) ?? null
          if (!before) return Promise.resolve()

          // await removeAnnotation(id)

          setter((s) => {
            s.annotations = s.annotations.filter((a) => a.id !== id)
            if (s.annCounts[before.offset] > 0) {
              s.annCounts[before.offset]--
            }
            if (s.selectedId === id) s.selectedId = null
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
            s.selectedId = id
          })
        },

        // ── export ────────────────────────────────────────────────────

        patchExport(patch) {
          setter((s) => {
            Object.assign(s.exportState, patch)
          })
        },

        async exportDoc(destPath: string) {
          const { file } = getter()
          if (!file) return
          await MorphIpc.toExport(file.path, destPath)
        },

        // ── doc operations ───────────────────────────────────────────

        openOperation(operation) {
          const { files, file, summaryVisible, summaryBeforeOperation } = getter()
          const count = file?.count ?? 0
          const order = Array.from({ length: count }, function (_, i) {
            return i
          })

          setter((s) => {
            if (summaryBeforeOperation === null) {
              s.summaryBeforeOperation = summaryVisible
            }
            s.summaryVisible = false
            s.activeOperation = operation
            if (operation === 'merge') {
              s.mergeModal.inputs = files.map(function (f) {
                return f.path
              })
              s.mergeModal.output = ''
              s.mergeModal.error = null
            } else if (operation === 'split') {
              s.splitModal.ranges = ''
              s.splitModal.limit = 2
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
            void getter().fetchThumbnails()
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
        patchMerge(patch) {
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
            await MorphIpc.toMerge(mergeModal.inputs, mergeModal.output)
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
        patchSplit(patch) {
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
              const count = file.count
              const offsets = parseRangesToOffsets(splitModal.ranges, count)
              if (!offsets.length) {
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
                  const to = Math.min(count, Math.max(start, end))
                  if (from > count || to < 1) return null
                  return `${from}-${to}`
                })
                .filter(function (part): part is string {
                  return part !== null
                })
              if (!rangeParts.length) {
                throw new Error('请输入有效页码范围（不超过总页数）')
              }
              const paths: string[] = await MorphIpc.toSplit(file.path, splitModal.destDir, {
                ranges: rangeParts
              })
              antdMessage.success(`拆分完成，已生成 ${paths.length} 个文件 → ${splitModal.destDir}`)
            } else {
              if (splitModal.limit <= 0) {
                throw new Error('每文件页数须大于 0')
              }
              const paths: string[] = await MorphIpc.toSplit(file.path, splitModal.destDir, {
                limit: splitModal.limit
              })
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
        patchConvert(patch) {
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
              const outPath: string = await MorphIpc.toDocument(
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

        patchOrganize(patch) {
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
              outPath = await MorphIpc.toReorder(
                file.path,
                organizeModal.order,
                organizeModal.dest
              )
            } else if (action === 'rotate') {
              if (!organizeModal.selected.length) {
                throw new Error('请先选择要旋转的页面')
              }
              outPath = await MorphIpc.toRotate(
                file.path,
                organizeModal.selected,
                90,
                organizeModal.dest
              )
            } else if (action === 'delete') {
              if (!organizeModal.selected.length) {
                throw new Error('请先选择要删除的页面')
              }
              outPath = await MorphIpc.toRemove(
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

        patchExtract(patch) {
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
            const outPath = await MorphIpc.toExtract(
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
              await store.removeAnnotation(entry.after.id)
            } else if (entry.kind === 'REMOVE_ANNOTATION' && entry.before) {
              await store.addAnnotation(entry.before)
            } else if (entry.kind === 'UPDATE_ANNOTATION' && entry.before) {
              await store.patchAnnotation(entry.before.id, {
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
            } else if (entry.kind === 'REMOVE_ANNOTATION' && entry.before) {
              await store.removeAnnotation(entry.before.id)
            } else if (entry.kind === 'UPDATE_ANNOTATION' && entry.after) {
              await store.patchAnnotation(entry.after.id, {
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

// ── Derived selectors ────────────────────────────────────────────────────────

function selectOffsetAnns(state: MorphState) {
  return state.annotations.filter(function (a) {
    return a.offset === state.offset
  })
}

function selectSelectedAnnotation(state: MorphState) {
  return state.annotations.find(function (a) {
    return a.id === state.selectedId
  }) ?? null
}

export { useMorphStore, selectOffsetAnns, selectSelectedAnnotation }