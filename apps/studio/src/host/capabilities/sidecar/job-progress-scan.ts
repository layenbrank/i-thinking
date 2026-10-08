import type { JobEvent, JobKind } from '@/shared/ipc/specs/sidecar'
import { reportOnce } from '@/host/framework/report'

interface TailState {
  runId: string
  kind: JobKind
  name: string
  offset: number
  /** 已处理过 start，避免重复开 tab */
  hasStarted: boolean
}

type ScanEmit = (event: JobEvent) => void

type ProgressFrame = Extract<JobEvent, { phase: 'progress' }>['progress']

/** 截断或强制收尾前：若仍挂着 start，补一条失败 end */
function finishOpenRun(state: TailState, emit: ScanEmit, error: string): void {
  if (!state.hasStarted || !state.runId) return
  emit({
    phase: 'end',
    runId: state.runId,
    kind: state.kind,
    name: state.name,
    ok: false,
    error
  })
  state.hasStarted = false
  state.runId = ''
}

/** ndjson 变短 = 新一次触发；先收尾上一次，避免假「运行中」 */
function onLogTruncated(state: TailState, emit: ScanEmit): void {
  finishOpenRun(state, emit, '进度被新一次触发覆盖')
  state.offset = 0
}

function beginRun(state: TailState, emit: ScanEmit, runIdRaw: string, name: string): void {
  state.runId = `job-${state.kind}-${runIdRaw}`
  state.name = name
  if (state.hasStarted) return
  state.hasStarted = true
  emit({
    phase: 'start',
    runId: state.runId,
    kind: state.kind,
    name
  })
}

function endRun(
  state: TailState,
  emit: ScanEmit,
  fields: { name: string; ok: boolean; error?: string }
): void {
  if (!state.runId) return
  emit({
    phase: 'end',
    runId: state.runId,
    kind: state.kind,
    name: fields.name,
    ok: fields.ok,
    error: fields.error
  })
  state.hasStarted = false
  state.runId = ''
}

/** orphan run.json：用 beginRun 开 tab，再由调用方 finishOpenRun */
function adoptOrphanMarker(
  state: TailState,
  marker: { run_id?: string; name?: string },
  fallbackName: string,
  emit: ScanEmit
): void {
  if (typeof marker.run_id !== 'string') return
  const name = typeof marker.name === 'string' ? marker.name : fallbackName
  beginRun(state, emit, marker.run_id, name)
}

const PHASE_HANDLERS: Record<
  string,
  (state: TailState, doc: Record<string, unknown>, emit: ScanEmit, fallbackName: string) => void
> = {
  start(state, doc, emit, fallbackName) {
    if (typeof doc.run_id !== 'string') return
    const name = typeof doc.name === 'string' ? doc.name : fallbackName
    beginRun(state, emit, doc.run_id, name)
  },
  progress(state, doc, emit, fallbackName) {
    if (!state.runId || !doc.progress || typeof doc.progress !== 'object') return
    const raw = doc.progress as Record<string, unknown>
    if (typeof raw.kind !== 'string' || raw.kind === 'heartbeat') return
    emit({
      phase: 'progress',
      runId: state.runId,
      kind: state.kind,
      name: state.name || fallbackName,
      progress: raw as ProgressFrame
    })
  },
  end(state, doc, emit, fallbackName) {
    if (!state.runId) return
    endRun(state, emit, {
      name: typeof doc.name === 'string' ? doc.name : fallbackName,
      ok: doc.ok === true,
      error: typeof doc.error === 'string' ? doc.error : undefined
    })
  }
}

/**
 * 消费 progress.ndjson 增量行。
 * start / progress / end 一律经同一 emit，保证同轮扫描内顺序固定。
 */
function consumeProgressLines(
  state: TailState,
  chunk: string,
  emit: ScanEmit,
  fallbackName: string
): void {
  const lines = chunk.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let doc: Record<string, unknown>
    try {
      doc = JSON.parse(trimmed) as Record<string, unknown>
    } catch (error) {
      // 按偏移量追尾会读到写了一半的最后一行：下一轮就能读到完整的
      reportOnce(`进度行不是 JSON：${fallbackName}/${state.kind}`, error)
      continue
    }
    const phase = typeof doc.phase === 'string' ? doc.phase : ''
    const handle = PHASE_HANDLERS[phase]
    if (handle) handle(state, doc, emit, fallbackName)
  }
}

export { adoptOrphanMarker, beginRun, consumeProgressLines, endRun, finishOpenRun, onLogTruncated }
export type { JobEvent, JobKind, ScanEmit, TailState }
