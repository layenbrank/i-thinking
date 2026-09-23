import { create } from 'zustand'

/**
 * corex 进度帧的落点 —— 与运行元数据（见 `./corex`）分家，因为两者的变化频率差三个数量级：
 * 「谁在跑、跑到第几步」一步一变，输出流一秒能来几百帧（子进程输出也按读缓冲切成帧）。
 *
 * 帧若一帧一次 `setState`，每次都要重建 runs 数组 → 列表、运行台、任务条全量重渲染，
 * 输出一多就闪、滚动位置也被反复打断。这里先攒进模块级缓冲，到点合并成**一次** set；
 * 且只换本批真有帧的那些运行的取值，其余运行的引用不变，订阅它们的组件不会被通知。
 */

type CorexProgress = Parameters<Parameters<typeof itc.sidecar.onProgress>[0]>[0]

/**
 * 进度帧 + 到达时刻。
 *
 * 时间戳必须在**帧到达时**取：日志是按整个帧数组重算的，若格式化那会儿才 `new Date()`，
 * 先来的几十行会被最后一帧刷成同一时刻。
 */
interface CorexFrame extends CorexProgress {
  receivedAt: Date
}

/** 攒帧到落地的间隔：约 12 fps 的日志刷新，看着连贯，又不至于一帧一次渲染 */
const FLUSH_MS = 80

/** 每个任务最多留这么多帧：`dev` 这类长跑任务的输出没有终点，不设上限迟早把页面拖垮 */
const MAX_FRAMES = 3_000

/** 一次运行的帧，外加被挤掉的旧帧数 */
interface RunFrames {
  frames: readonly CorexFrame[]
  dropped: number
}

/** 没有帧时的稳定取值：同一个引用，订阅者不会因为「还是空」而重渲染 */
const NO_FRAMES: RunFrames = { frames: [], dropped: 0 }

interface RunLogsStore {
  framesById: Record<string, RunFrames>
}

const useRunLogsStore = create<RunLogsStore>(function () {
  return { framesById: {} }
})

let pending: Map<string, CorexFrame[]> | null = null
let timer: ReturnType<typeof setTimeout> | null = null

/**
 * 帧只在登记过的运行上落地：运行从界面消失（用户删掉、清空、换一次试跑）就注销，
 * 而 corex 那边不会因此停下 —— 它还会继续为这条运行冒帧，那些帧没有可贴的地方，
 * 收下来只会攒成一坨谁也看不见的日志。
 */
const liveRuns = new Set<string>()

function registerRun(id: string): void {
  liveRuns.add(id)
}

/** 把攒着的帧一次落地；没攒着就什么都不做 */
function flushRunFrames(): void {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }

  const batch = pending
  pending = null
  if (!batch) return

  useRunLogsStore.setState(function (state) {
    const framesById = { ...state.framesById }
    batch.forEach(function (raw, id) {
      const kept = framesById[id] ?? NO_FRAMES
      const all = kept.frames.concat(raw)
      const overflow = all.length - MAX_FRAMES
      framesById[id] = {
        frames: overflow > 0 ? all.slice(overflow) : all,
        dropped: kept.dropped + Math.max(0, overflow)
      }
    })
    return { framesById }
  })
}

/** 收一帧：先记账，落地可以等（等不及的地方自己叫 `flushRunFrames`） */
function appendRunFrame(frame: CorexFrame): void {
  if (!liveRuns.has(frame.runId)) return

  if (!pending) pending = new Map()
  const frames = pending.get(frame.runId)

  if (frames) frames.push(frame)
  else pending.set(frame.runId, [frame])

  if (timer === null) timer = setTimeout(flushRunFrames, FLUSH_MS)
}

/** 不经过 React 读某条运行的帧（测试、一次性快照用） */
function findRunFrames(id: string): RunFrames {
  return useRunLogsStore.getState().framesById[id] ?? NO_FRAMES
}

/**
 * 丢弃若干任务的帧（任务被移除 / 清空）；攒着还没落地的那部分一并作废。
 * 一并注销：这些任务不会再回来（编号不重用），往后冒出来的帧直接不收。
 */
function dropRunFrames(ids: readonly string[]): void {
  const dropped = new Set(ids)

  dropped.forEach(function (id) {
    liveRuns.delete(id)
  })

  if (pending) {
    dropped.forEach(function (id) {
      pending?.delete(id)
    })
  }

  useRunLogsStore.setState(function (state) {
    if (
      !ids.some(function (id) {
        return id in state.framesById
      })
    ) {
      return state
    }

    const framesById: Record<string, RunFrames> = {}
    Object.keys(state.framesById).forEach(function (id) {
      if (!dropped.has(id)) framesById[id] = state.framesById[id]
    })
    return { framesById }
  })
}

/** 订阅某条运行的帧；别的运行来帧不会惊动这里（它们的取值引用没换） */
function useRunFrames(runId: string | null): RunFrames {
  return useRunLogsStore(function (state) {
    if (!runId) return NO_FRAMES
    return state.framesById[runId] ?? NO_FRAMES
  })
}

export {
  MAX_FRAMES,
  appendRunFrame,
  dropRunFrames,
  findRunFrames,
  flushRunFrames,
  registerRun,
  useRunFrames
}
export type { CorexFrame, CorexProgress, RunFrames }
