import { BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

import { CHANNELS } from '@/shared/ipc/channels'
import { reportOnce } from '@/host/framework/report'

import {
  consumeProgressLines,
  finishOpenRun,
  onLogTruncated,
  type JobEvent,
  type JobKind,
  type TailState
} from './job-progress-scan'

const POLL_MS = 400
const KINDS: JobKind[] = ['cron', 'watch']

/**
 * 盯 `<data>/{cron,watch}/<name>/progress.ndjson`：
 * 守护触发落盘后，起止与步骤帧一律走 JOB_EVENT（同频道保序）。
 */
function watchJobProgress(dataDir: string): () => void {
  const tails = new Map<string, TailState>()
  let timer: ReturnType<typeof setInterval> | null = null
  let stopped = false

  function broadcast(payload: JobEvent) {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(CHANNELS.SIDECAR.JOB_EVENT, payload)
      }
    }
  }

  function scanKind(kind: JobKind) {
    const root = path.join(dataDir, kind)
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(root, { withFileTypes: true })
    } catch (error) {
      // 没有 cron / watch 目录是常态（没建过守护）
      reportOnce(`读取守护目录失败：${root}`, error)
      return
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const name = entry.name
      const jobDir = path.join(root, name)
      const markerPath = path.join(jobDir, 'run.json')
      const logPath = path.join(jobDir, 'progress.ndjson')
      const key = `${kind}:${name}`

      const hasMarker = fs.existsSync(markerPath)
      const hasLog = fs.existsSync(logPath)
      const hasMeta = fs.existsSync(path.join(jobDir, 'meta.json'))
      if (!hasMarker && !hasLog) {
        tails.delete(key)
        continue
      }

      let state = tails.get(key)
      if (!state) {
        state = {
          runId: '',
          kind,
          name,
          offset: 0,
          hasStarted: false
        }
        tails.set(key, state)
      }

      // supervisor 已被强制清掉（无 meta），进行中标记还在 → 收尾，避免终端假运行中
      if (hasMarker && !hasMeta) {
        if (state.hasStarted && state.runId) {
          finishOpenRun(state, broadcast, '守护已强制终止')
        }
        try {
          fs.unlinkSync(markerPath)
        } catch (error) {
          // 标记可能已被守护自己清掉
          reportOnce(`清理运行标记失败：${markerPath}`, error)
        }
        continue
      }

      if (!hasLog) continue

      let stat: fs.Stats
      try {
        stat = fs.statSync(logPath)
      } catch (error) {
        // 扫描与守护写盘/清目录会撞车：下一轮再看
        reportOnce(`读取进度文件信息失败：${logPath}`, error)
        continue
      }
      if (stat.size < state.offset) {
        onLogTruncated(state, broadcast)
      }
      if (stat.size === state.offset) {
        if (!hasMarker && state.hasStarted && state.runId) {
          finishOpenRun(state, broadcast, '进度中断')
        }
        continue
      }

      let chunk: string
      try {
        const fd = fs.openSync(logPath, 'r')
        try {
          const length = stat.size - state.offset
          const buf = Buffer.alloc(length)
          fs.readSync(fd, buf, 0, length, state.offset)
          chunk = buf.toString('utf8')
        } finally {
          fs.closeSync(fd)
        }
      } catch (error) {
        reportOnce(`读取进度增量失败：${logPath}`, error)
        continue
      }
      state.offset = stat.size

      consumeProgressLines(state, chunk, broadcast, name)

      if (!hasMarker && state.hasStarted && state.runId) {
        finishOpenRun(state, broadcast, '进度中断')
      }
    }
  }

  function tick() {
    if (stopped) return
    for (const kind of KINDS) scanKind(kind)
  }

  timer = setInterval(tick, POLL_MS)
  tick()

  return function () {
    stopped = true
    if (timer) clearInterval(timer)
    timer = null
    tails.clear()
  }
}

export { watchJobProgress }
export type { JobEvent }
