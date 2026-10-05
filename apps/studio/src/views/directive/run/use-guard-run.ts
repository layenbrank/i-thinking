import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { JobKind, JobView } from '@/shared/ipc/specs/sidecar'
import { useCorexStore } from '@/stores/corex'
import { toIpcMessage } from '@/utils/ipc.errors.ts'

/** 墙面多卡共用 jobs，避免每张卡各打一枪 */
const JOBS_CACHE_MS = 2_500
const DEAD_POLL_MS = 150
const DEAD_POLL_MAX = 20
let jobsCache: { at: number; jobs: JobView[] } | null = null

interface GuardAlive {
  cron: boolean
  watch: boolean
}

interface UseGuardRunOptions {
  name: string
  /** 守护启动前：通常先保存草稿；返回最终指令名，null = 取消 */
  beforeGuard?: () => Promise<string | null>
}

interface GuardRunApi {
  alive: GuardAlive
  isBusy: boolean
  stopKind: JobKind | null
  isCronRunning: boolean
  isWatchRunning: boolean
  isCronStopping: boolean
  isWatchStopping: boolean
  refreshAlive: () => Promise<void>
  startGuard: (kind: JobKind) => Promise<void>
  requestStop: (kind: JobKind) => void
  confirmStop: (kind: JobKind, force: boolean) => Promise<void>
  closeStopDialog: () => void
}

function sleep(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms)
  })
}

async function fetchJobs(): Promise<JobView[]> {
  const now = Date.now()
  if (jobsCache && now - jobsCache.at < JOBS_CACHE_MS) return jobsCache.jobs
  const reply = await itc.sidecar.jobs({})
  const jobs = reply.jobs ?? []
  jobsCache = { at: now, jobs }
  return jobs
}

function dropJobsCache() {
  jobsCache = null
}

function isAlive(jobs: JobView[], kind: JobKind, name: string): boolean {
  return jobs.some(function (job) {
    return job.kind === kind && job.name === name && job.is_alive
  })
}

/** STOP 后 supervisor 可能还没退出；轮询直到死去或次数用尽 */
async function waitUntilDead(kind: JobKind, name: string): Promise<boolean> {
  for (let i = 0; i < DEAD_POLL_MAX; i += 1) {
    dropJobsCache()
    const jobs = await fetchJobs()
    if (!isAlive(jobs, kind, name)) return true
    await sleep(DEAD_POLL_MS)
  }
  return false
}

/**
 * 停守护：对齐 CLI。
 * - `force: false` 且当前无触发任务 → 立刻退（STOP）
 * - `force: false` 且有任务在跑 → 等当前轮结束再退
 * - `force: true` → STOP_FORCE，立刻收尾终端态
 */
async function stopGuardJob(fields: {
  kind: JobKind
  name: string
  force: boolean
  isTaskRunning: boolean
}): Promise<void> {
  await itc.sidecar.stopJob({
    kind: fields.kind,
    name: fields.name,
    force: fields.force
  })
  dropJobsCache()
  const label = fields.kind === 'cron' ? 'cron' : 'watch'
  if (fields.force) {
    useCorexStore.getState().cancelTriggerRuns(fields.name, fields.kind)
    toast.success(fields.kind === 'cron' ? '已强制停止 cron' : '已强制停止 watch', {
      description: '进行中的任务已一并终止'
    })
    return
  }
  if (fields.isTaskRunning) {
    useCorexStore.getState().markTriggerStopping(fields.name, fields.kind)
    toast.success(fields.kind === 'cron' ? '已请求停止 cron' : '已请求停止 watch', {
      description: '当前任务结束后再退出'
    })
    return
  }
  toast.success(fields.kind === 'cron' ? '已停止 cron' : '已停止 watch', {
    description: label
  })
}

function useGuardRun(options: UseGuardRunOptions): GuardRunApi {
  const [alive, updateAlive] = useState<GuardAlive>({ cron: false, watch: false })
  const [isBusy, updateBusy] = useState(false)
  const [stopKind, updateStopKind] = useState<JobKind | null>(null)
  const wasCronRunning = useRef(false)
  const wasWatchRunning = useRef(false)

  const isCronRunning = useCorexStore(function (state) {
    return state.runs.some(function (run) {
      return run.name === options.name && run.status === 'running' && run.trigger === 'cron'
    })
  })
  const isWatchRunning = useCorexStore(function (state) {
    return state.runs.some(function (run) {
      return run.name === options.name && run.status === 'running' && run.trigger === 'watch'
    })
  })
  const isCronStopping = useCorexStore(function (state) {
    return state.runs.some(function (run) {
      return (
        run.name === options.name &&
        run.status === 'running' &&
        run.trigger === 'cron' &&
        run.isStopping
      )
    })
  })
  const isWatchStopping = useCorexStore(function (state) {
    return state.runs.some(function (run) {
      return (
        run.name === options.name &&
        run.status === 'running' &&
        run.trigger === 'watch' &&
        run.isStopping
      )
    })
  })

  async function refreshAlive() {
    if (!options.name) return
    try {
      const jobs = await fetchJobs()
      updateAlive({
        cron: isAlive(jobs, 'cron', options.name),
        watch: isAlive(jobs, 'watch', options.name)
      })
    } catch {
      updateAlive({ cron: false, watch: false })
    }
  }

  // 触发任务刚结束（含优雅停止后 supervisor 退出）：立刻对账守护是否还活着
  useEffect(
    function () {
      if (wasCronRunning.current && !isCronRunning) {
        dropJobsCache()
        void refreshAlive()
      }
      wasCronRunning.current = isCronRunning
    },
    [isCronRunning, options.name]
  )
  useEffect(
    function () {
      if (wasWatchRunning.current && !isWatchRunning) {
        dropJobsCache()
        void refreshAlive()
      }
      wasWatchRunning.current = isWatchRunning
    },
    [isWatchRunning, options.name]
  )

  async function startGuard(kind: JobKind) {
    if (!options.name || isBusy) return
    updateBusy(true)
    try {
      const name = options.beforeGuard ? await options.beforeGuard() : options.name
      if (!name) return
      await itc.sidecar.startJob({ kind, name })
      dropJobsCache()
      toast.success(kind === 'cron' ? '已启动 cron 守护' : '已启动 watch 守护', {
        description: name
      })
      await refreshAlive()
    } catch (error) {
      toast.error(kind === 'cron' ? '无法启动 cron' : '无法启动 watch', {
        description: toIpcMessage(error, '启动失败')
      })
    } finally {
      updateBusy(false)
    }
  }

  function requestStop(kind: JobKind) {
    const isTaskRunning = kind === 'cron' ? isCronRunning : isWatchRunning
    if (isTaskRunning) {
      updateStopKind(kind)
      return
    }
    void confirmStop(kind, false)
  }

  async function confirmStop(kind: JobKind, force: boolean) {
    if (!options.name || isBusy) return
    const isTaskRunning = kind === 'cron' ? isCronRunning : isWatchRunning
    updateBusy(true)
    try {
      await stopGuardJob({
        kind,
        name: options.name,
        force,
        isTaskRunning
      })
      updateStopKind(null)
      if (force || !isTaskRunning) {
        updateAlive(function (prev) {
          return { ...prev, [kind]: false }
        })
        const isDead = await waitUntilDead(kind, options.name)
        if (!isDead) await refreshAlive()
      }
    } catch (error) {
      toast.error('无法停止守护', { description: toIpcMessage(error, '停止失败') })
      await refreshAlive()
    } finally {
      updateBusy(false)
    }
  }

  function closeStopDialog() {
    updateStopKind(null)
  }

  return {
    alive,
    isBusy,
    stopKind,
    isCronRunning,
    isWatchRunning,
    isCronStopping,
    isWatchStopping,
    refreshAlive,
    startGuard,
    requestStop,
    confirmStop,
    closeStopDialog
  }
}

export { dropJobsCache, fetchJobs, isAlive, useGuardRun, waitUntilDead }
export type { GuardAlive, GuardRunApi }
