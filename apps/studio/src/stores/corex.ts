import { toast } from 'sonner'
import { create } from 'zustand'

import type {
  DirectiveContent,
  DirectiveDocument,
  DirectiveEntry
} from '@/shared/ipc/specs/sidecar'
import { toIpcMessage } from '@/utils/ipc.errors.ts'

import { appendRunFrame, dropRunFrames, flushRunFrames, registerRun } from './run-logs'

/**
 * corex 引擎的运行数据（谁的功能谁维护）。
 *
 * 目录（动作 / 指令）来自 `itc.sidecar.actions` / `itc.sidecar.directives`；指令的读、写、
 * 跑一律透传给 corex —— 宿主不自己拼 YAML，也就不存在「编辑器里的模型」与 corex 真跑的
 * 那份悄悄错位。sidecar 未就绪时目录为空、运行抛错，由 UI 呈现，不在这里吞。
 *
 * 运行是**多任务**的：corex 每个连接跑一个任务，宿主每次运行发一条请求，同一条指令可以
 * 同时在跑多次。所以状态是 `runs` 数组而不是一个 `isRunning` —— 帧靠 `runId` 各归各位。
 *
 * 「这条指令的结果看没看过」是**宿主**的事（corex 不记谁看没看），故存在这里、落到宿主自己的
 * KV：重启之后卡片上的未读圆点还得对得上。
 *
 * 这里只放「一步一变」的元数据；成百上千的进度帧在 `./run-logs` 攒批落地。
 */

type CorexAction = Awaited<ReturnType<typeof itc.sidecar.actions>>[number]

type RunStatus = 'running' | 'ok' | 'failed'
const MAX_FINISHED_RUNS = 100

/** 未读存档的键：指令名 → 上次「看过结果」的时刻 */
const SEEN_KEY = 'directive.seen'

/** 存档只认「指令名 → 正数时刻」；坏掉的一项丢掉，其余照样用 */
function parseSeen(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const seen: Record<string, number> = {}
  Object.entries(raw as Record<string, unknown>).forEach(function ([name, at]) {
    if (typeof at === 'number' && Number.isFinite(at) && at > 0) seen[name] = at
  })
  return seen
}

async function readSeen(): Promise<Record<string, number>> {
  try {
    return parseSeen(await itc.store.toRead({ key: SEEN_KEY }))
  } catch (error) {
    console.warn('[corex] 读不到未读存档', error)
    return {}
  }
}

/** 一次运行：进度、结果、错误都归它自己，与别的任务互不干扰 */
interface CorexRun {
  id: string
  /** 指令名；列表卡片据此把状态挂到对应指令上 */
  name: string
  status: RunStatus
  startedAt: Date
  endedAt: Date | null
  /** 已结束的步骤数（`step_end` 一帧一步，被 `when` 跳过的没有帧、自然不计）：卡片进度只看它 */
  doneSteps: number
  /** corex 的终帧数据；失败时为 `null` */
  result: unknown
  error: string | null
}

interface CorexStore {
  catalog: CorexAction[]
  directives: DirectiveEntry[]
  /** 目录读成功过一次。失败时仍是 `false`，界面据此给出「重试」而不是「还没有指令」 */
  isLoaded: boolean
  isLoading: boolean
  /** 上次读目录失败的原因；没出错是 `null`。界面靠它区分「corex 没起来」和「目录是空的」 */
  loadError: string | null
  runs: CorexRun[]
  /** 指令名 → 上次「看过结果」的时刻；卡片上的未读圆点靠它算（跨会话留着） */
  seenAt: Record<string, number>

  initialize: () => Promise<void>
  /**
   * 重读指令目录：保存过（新建 / 改名）之后列表才跟得上磁盘。
   * 失败不往外抛 —— 调用它多半是「保存成功了顺手刷新」，刷新失败不该被当成保存失败。
   */
  refreshDirectives: () => Promise<void>
  /** 记下「这条指令的结果我看过了」 */
  markSeen: (name: string) => void
  /** 一次记下一批（列表页的「全部已读」）；只写一次存档 */
  markSeenAll: (names: readonly string[]) => void
  /** 读一条指令，返回 corex 反序列化出的模型（编辑器只认这一份） */
  loadDirective: (name: string) => Promise<DirectiveContent>
  /** 落盘一条指令，返回 corex 写下的那份（名字可能被它规范化） */
  saveDirective: (content: DirectiveContent) => Promise<DirectiveDocument>
  /**
   * 起一次运行，**立刻**返回它的编号；进度与结果随后落进 `runs`，调用方不等它结束。
   * 返回编号而不是 Promise —— 界面要的是「拿到哪一次」，不是「跑完了没」。
   */
  startRun: (name: string, input: Record<string, unknown>) => string
  removeRun: (id: string) => void
  /** 清掉已结束的任务；还在跑的留着 —— 宿主没有叫停 corex 任务的手段 */
  clearRuns: () => void
}

let unsubscribeProgress: (() => void) | null = null
let runSeq = 0

/**
 * 运行编号：只在宿主内区分任务，不参与 corex 协议。
 * 不依赖 `crypto`（`file://` 下 `randomUUID` 未必可用），时间戳 + 自增就够唯一。
 */
function nextRunId(): string {
  runSeq += 1
  return `run-${Date.now().toString(36)}-${runSeq}`
}

/** 按「还在跑 / 已结束」分开：清空只清得掉后者 —— 宿主没有叫停 corex 任务的手段 */
function partitionRuns(runs: readonly CorexRun[]): [CorexRun[], CorexRun[]] {
  const alive: CorexRun[] = []
  const finished: CorexRun[] = []

  runs.forEach(function (run) {
    if (run.status === 'running') alive.push(run)
    else finished.push(run)
  })

  return [alive, finished]
}

/** 保留全部运行中的任务，只淘汰最早结束的历史记录，避免状态集合无限增长。 */
function retainRuns(runs: readonly CorexRun[]): { kept: CorexRun[]; evicted: string[] } {
  const finishedCount = runs.reduce(function (count, run) {
    return count + (run.status === 'running' ? 0 : 1)
  }, 0)
  const excess = finishedCount - MAX_FINISHED_RUNS
  if (excess <= 0) {
    return { kept: [...runs], evicted: [] }
  }

  const evicted: string[] = []
  let remaining = excess
  const kept = runs.filter(function (run) {
    if (run.status === 'running') {
      return true
    }
    if (remaining > 0) {
      remaining -= 1
      evicted.push(run.id)
      return false
    }
    return true
  })
  return { kept, evicted }
}

/**
 * 落一次运行列表，并把被淘汰那几条的帧缓冲一起收掉。
 *
 * 帧不在这个 store 里（见 `./run-logs`），所以回收得在这里显式叫一次：淘汰是长期挂机时
 * 唯一会走的路径，漏掉就等于内存只增不减。回收放在 set 之外 —— 改状态的函数不该带副作用。
 */
function commitRuns(runs: readonly CorexRun[]): { runs: CorexRun[] } {
  const { kept, evicted } = retainRuns(runs)
  dropRunFrames(evicted)
  return { runs: kept }
}

export const useCorexStore = create<CorexStore>(function (setter, getter) {
  /**
   * 改一次运行的元数据。落笔前先把攒着的帧推进去：日志是把「帧 + 收尾」拼起来看的，
   * 若帧还在缓冲里，收尾那行会算少步数、还会插到本该在它前面的输出前面。
   */
  function patchRun(id: string, patch: Partial<CorexRun> | ((run: CorexRun) => Partial<CorexRun>)) {
    flushRunFrames()
    const runs = getter().runs.map(function (run) {
      if (run.id !== id) return run
      return { ...run, ...(typeof patch === 'function' ? patch(run) : patch) }
    })
    setter(commitRuns(runs))
  }

  /**
   * 记下若干条指令的结果「已看过」。
   *
   * 存档是整份覆盖写，所以一批只写一次 —— 「全部已读」不该按指令条数发上百次 IPC。
   * 没有更新的项就直接返回：运行台会反复报「这条在看着」，重复的写没有意义。
   */
  function stampSeen(names: readonly string[]): void {
    const at = Date.now()
    const seenAt = getter().seenAt
    const next: Record<string, number> = { ...seenAt }
    let isDirty = false

    names.forEach(function (name) {
      if (!name || at <= (seenAt[name] ?? 0)) return
      next[name] = at
      isDirty = true
    })
    if (!isDirty) return

    setter({ seenAt: next })
    // 存档失败只影响下次启动的圆点，不必惊动界面
    void itc.store.toWrite({ key: SEEN_KEY, value: next }).catch(function (error) {
      console.warn('[corex] 未读存档写不进去', error)
    })
  }

  return {
    catalog: [],
    directives: [],
    isLoaded: false,
    isLoading: false,
    loadError: null,
    runs: [],
    seenAt: {},

    async initialize() {
      if (getter().isLoaded || getter().isLoading) return
      setter({ isLoading: true })

      if (!unsubscribeProgress) {
        unsubscribeProgress = itc.sidecar.onProgress(function (frame) {
          appendRunFrame({ ...frame, receivedAt: new Date() })

          // 只有「一步走完」要惊动元数据；输出帧一个都不碰，列表便不跟着输出流重渲染
          if (frame.kind === 'step_end') {
            patchRun(frame.runId, function (run) {
              return { doneSteps: run.doneSteps + 1 }
            })
          }
        })
      }

      try {
        const [catalog, directives, seenAt] = await Promise.all([
          itc.sidecar.actions(),
          itc.sidecar.directives(),
          readSeen()
        ])
        setter({ catalog, directives, seenAt, isLoaded: true, isLoading: false, loadError: null })
      } catch (error) {
        console.error('[corex] 初始化失败', error)
        setter({
          isLoading: false,
          loadError: error instanceof Error ? error.message : String(error)
        })
      }
    },

    async refreshDirectives() {
      try {
        setter({ directives: await itc.sidecar.directives() })
      } catch (error) {
        // 已经落盘的那份仍然有效：列表停在旧内容，只把失败说出来。
        // 不能往外抛 —— 调用方多是「保存成功了顺手刷新」，抛出会把成功报成失败。
        console.error('[corex] 重读指令目录失败', error)
        toast.error('重新读取指令目录失败', {
          description: error instanceof Error ? error.message : String(error)
        })
      }
    },

    markSeen(name) {
      stampSeen([name])
    },

    markSeenAll(names) {
      stampSeen(names)
    },

    async loadDirective(name) {
      const document = await itc.sidecar.directive({ name })
      return document.definition
    },

    async saveDirective(content) {
      return itc.sidecar.saveDirective(content)
    },

    startRun(name, input) {
      const id = nextRunId()
      const run: CorexRun = {
        id,
        name,
        status: 'running',
        startedAt: new Date(),
        endedAt: null,
        doneSteps: 0,
        result: null,
        error: null
      }
      // 先登记再落库：进度帧只认登记过的运行，编号也不会重用，登记绝不会晚于第一帧
      registerRun(id)
      setter(commitRuns([...getter().runs, run]))

      void (async function () {
        try {
          const result = await itc.sidecar.run({ name, input, runId: id })
          patchRun(id, { status: 'ok', result, endedAt: new Date() })
        } catch (error) {
          // 任务失败也要在日志里留一行：运行台只显示状态，原因得能查
          console.error('[corex] 运行失败', name, error)
          patchRun(id, {
            status: 'failed',
            error: toIpcMessage(error, '运行失败'),
            endedAt: new Date()
          })
        }
      })()

      return id
    },

    removeRun(id) {
      dropRunFrames([id])
      setter(function (state) {
        return {
          runs: state.runs.filter(function (run) {
            return run.id !== id
          })
        }
      })
    },

    clearRuns() {
      const [alive, finished] = partitionRuns(getter().runs)
      dropRunFrames(
        finished.map(function (run) {
          return run.id
        })
      )
      setter({ runs: alive })
    }
  }
})

export type { CorexAction, CorexRun, RunStatus }
