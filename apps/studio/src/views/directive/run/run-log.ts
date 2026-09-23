/**
 * 运行面板的日志行。
 *
 * corex 的进度帧是**步骤级**的：被 `when` 跳过的步骤连帧都没有，终帧也只带**最后一步**的
 * 返回值。所以「跑了几步、成没成、输出了什么」得在收尾时自己统计，不能指望 corex 回一个汇总。
 *
 * 时间的来源是 `CorexFrame.receivedAt`（帧到达那一刻），不是格式化那一刻：日志是按整个帧
 * 数组重算的，取当前时间会把先来的几十行全刷成同一时刻。
 */

import type { CorexRun } from '@/stores/corex'
import type { CorexFrame } from '@/stores/run-logs'

import type { RunLog } from './types'

/** 子进程的两条流：`step_output` 帧带的那一路 */
type Stream = NonNullable<CorexFrame['stream']>

/** 返回值展开的字符上限：终端输出可能很长，一条日志不该刷满面板 */
const MAX_RESULT_CHARS = 4_000

/**
 * 单段输出的字符上限。长跑任务的输出一段能长到几兆（相邻块会合成一段），
 * 渲染这种文本节点会把布局拖垮 —— 留最后一段就好，滚动看的就是尾巴。
 */
const MAX_OUTPUT_CHARS = 60_000

/**
 * 一段输出最多攒多少行。时间和级别图标只画在段首，段太长时滚到中段就只剩正文，
 * 左栏的时间轴断了。日志面板约一屏十来行，攒到 20 行就落一段，
 * 保证滚到哪里都离一个时间锚点不远。
 */
const MAX_BLOCK_LINES = 20

/** 保留的最近输出段数：更早的段连 DOM 一起丢掉，免得长跑把渲染拖垮 */
const MAX_OUTPUT_SEGMENTS = 12

const OUTPUT_CLIPPED = '…（更早的输出已省略）\n'

function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  const ms = String(date.getMilliseconds()).padStart(3, '0')
  return `${hh}:${mm}:${ss}.${ms}`
}

/**
 * 终端控制序列：CSI（`ESC [ 参数 字母`）、OSC（`ESC ] … BEL/ST`）、两字节转义（`ESC \ ] ^ _`）。
 * 终端把它们解释成颜色与光标移动，日志面板只当文本渲染 —— 留着就是一串乱码。
 */
// eslint-disable-next-line no-control-regex -- 要匹配的就是这些控制符本身
const TERMINAL_CONTROLS = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)?|[\u005c-\u005f])/g

/** 剩下的单字节控制符（BEL、退格、换页…）：一律没有可读的含义 */
// eslint-disable-next-line no-control-regex -- 同上
const LONE_CONTROLS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g

/**
 * `\r` 在终端里是回到行首覆盖，不是换行。子进程的进度条全靠它反复重画，
 * 直接渲染会刷出几十行只有进度条的碎行 —— 按终端语义只留最后覆盖的那一版。
 */
function collapseReturns(text: string): string {
  if (!text.includes('\r')) return text
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(function (part) {
      const at = part.lastIndexOf('\r')
      return at < 0 ? part : part.slice(at + 1)
    })
    .join('\n')
}

/**
 * 子进程的输出是直通上来的：动作的结果、报错里的 stderr 都带着原样的转义与 `\r`。
 * 日志是给人读的，进 `line` 的文本一律先擦干净，免得每个入口各洗一遍还有漏的。
 */
function sanitizeTerminalText(text: string): string {
  return collapseReturns(text.replace(TERMINAL_CONTROLS, '').replace(LONE_CONTROLS, ''))
}

function line(id: number, level: RunLog['level'], message: string, at: Date = new Date()): RunLog {
  return { id, time: formatTime(at), level, message: sanitizeTerminalText(message) }
}

/** 把 corex 进度帧格式化成一行日志 */
function formatFrame(frame: CorexFrame, index: number): RunLog {
  const at = frame.receivedAt

  if (frame.kind === 'step_start') {
    return line(index, 'info', `[${frame.step}] [step_start]\n${frame.action}`, at)
  }

  if (frame.kind === 'step_progress') {
    const done = frame.done !== undefined ? String(frame.done) : ''
    const total = frame.total !== null && frame.total !== undefined ? `/${frame.total}` : ''
    const unit = frame.unit ? ` ${frame.unit}` : ''
    return line(index, 'info', `[${frame.step}] [progress] ${done}${total}${unit}`, at)
  }

  const isFailed = frame.ok === false
  const took = frame.took_ms !== undefined ? ` (${frame.took_ms}ms)` : ''
  return line(
    index,
    isFailed ? 'error' : 'success',
    `[${frame.step}] [${isFailed ? 'step_fail' : 'step_ok'}] ${frame.action}\ncompleted${took}`,
    at
  )
}

/** 攒着的输出片段：引擎按读缓冲切块，逐块成行会把一段输出撑成几十行 */
interface OutputChunk {
  step: string
  stream: Stream
  at: Date
  text: string
  /** 已攒的换行数：判断够不够一段不必每次重扫整块 */
  breaks: number
}

function countBreaks(text: string): number {
  let count = 0
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) count += 1
  }
  return count
}

function pushOutput(entries: RunLog[], segments: RunLog[], chunk: OutputChunk): void {
  const entry = line(
    entries.length,
    'info',
    `[${chunk.step}] [${chunk.stream}]\n${chunk.text}`,
    chunk.at
  )
  entries.push(entry)
  segments.push(entry)
  if (segments.length <= MAX_OUTPUT_SEGMENTS) return

  const oldest = segments.shift()
  const at = oldest ? entries.indexOf(oldest) : -1
  if (at >= 0) entries.splice(at, 1)
  const head = segments[0]
  if (head && !head.message.startsWith(OUTPUT_CLIPPED)) {
    head.message = OUTPUT_CLIPPED + head.message
  }
}

/** 帧 → 日志行。相邻的同一步同一条流的输出片段合成一段，其余一帧一行 */
function formatFrames(frames: readonly CorexFrame[]): RunLog[] {
  const entries: RunLog[] = []
  const segments: RunLog[] = []
  let chunk: OutputChunk | null = null

  frames.forEach(function (frame) {
    if (frame.kind !== 'step_output') {
      if (chunk) pushOutput(entries, segments, chunk)
      chunk = null
      entries.push(formatFrame(frame, entries.length))
      return
    }

    const stream: Stream = frame.stream === 'stderr' ? 'stderr' : 'stdout'
    const text = frame.text ?? ''

    if (chunk === null || chunk.step !== frame.step || chunk.stream !== stream) {
      if (chunk) pushOutput(entries, segments, chunk)
      chunk = { step: frame.step, stream, at: frame.receivedAt, text: '', breaks: 0 }
    }

    chunk.text += text
    chunk.breaks += countBreaks(text)
    if (chunk.text.length > MAX_OUTPUT_CHARS) {
      chunk.text = OUTPUT_CLIPPED + chunk.text.slice(-MAX_OUTPUT_CHARS)
    }
    if (chunk.breaks >= MAX_BLOCK_LINES) {
      pushOutput(entries, segments, chunk)
      chunk = null
    }
  })

  if (chunk) pushOutput(entries, segments, chunk)

  // 段落会被丢掉（超量），按最终顺序重编号：id 是行标识，既不重复也不留洞
  for (let i = 0; i < entries.length; i += 1) {
    entries[i].id = i
  }
  return entries
}

function clip(text: string): string {
  if (text.length <= MAX_RESULT_CHARS) {
    return text
  }
  return `${text.slice(0, MAX_RESULT_CHARS)}\n…（已截断，共 ${text.length} 字符）`
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    console.warn('[directive] 返回值无法序列化', error)
    return String(value)
  }
}

/**
 * 单动作的返回值（`shell.run` / `copy.run` …）直接展开成可读的几行，其余原样打 JSON。
 *
 * `at` 跟着运行结束时间走：这几行是终帧的展开，用「渲染时刻」当时间戳会让复制出去的
 * 文本里出现晚于运行本身的时间。
 */
function toResultLines(result: unknown, startId: number, at?: Date): RunLog[] {
  if (result === null || result === undefined) {
    return [line(startId, 'info', '最后一步没有返回值（动作本身不产出数据，或被 when 跳过）', at)]
  }
  if (typeof result !== 'object') {
    return [line(startId, 'info', String(result), at)]
  }

  const doc = result as Record<string, unknown>
  const entries: RunLog[] = []
  let id = startId

  if (typeof doc.exit_code === 'number') {
    entries.push(line(id++, 'info', `退出码 ${doc.exit_code}`, at))
  }
  if (doc.success === false) {
    entries.push(line(id++, 'error', '动作返回 success = false', at))
  }
  const stdout = toText(doc.stdout)
  if (stdout) {
    entries.push(line(id++, 'info', `stdout\n${clip(stdout)}`, at))
  }
  const stderr = toText(doc.stderr)
  if (stderr) {
    entries.push(line(id++, doc.success === false ? 'error' : 'info', `stderr\n${clip(stderr)}`, at))
  }

  if (entries.length === 0) {
    entries.push(line(id++, 'info', `返回值\n${clip(toJson(result))}`, at))
  }
  return entries
}

/**
 * 收尾几行：先说真正跑过的步骤数（`run.doneSteps` 由 `step_end` 帧累加，被 `when` 跳过的
 * 步骤没有帧、自然不计），再展开 corex 的终帧。失败时终帧没有数据，原因就在 `run.error` 里。
 * 还在跑的任务没有收尾 —— 日志以最后一帧结束，符合「进度是增量的」。
 */
function formatOutcome(run: CorexRun, stepTotal: number, startId: number): RunLog[] {
  if (run.status === 'running') {
    return []
  }

  const ran = run.doneSteps
  const rest = Math.max(0, stepTotal - ran)
  const progress = stepTotal > 0 ? `${ran}/${stepTotal} 步` : `${ran} 步`

  if (run.status === 'failed') {
    const entries = [
      line(startId, 'error', `运行失败 · 已执行 ${progress}`, run.endedAt ?? undefined)
    ]
    if (run.error) {
      entries.push(line(startId + 1, 'error', run.error, run.endedAt ?? undefined))
    }
    return entries
  }

  const entries = [
    line(
      startId,
      'success',
      `运行完成 · 执行 ${progress}${rest > 0 ? `，${rest} 步未执行` : ''}`,
      run.endedAt ?? undefined
    )
  ]
  return entries.concat(toResultLines(run.result, startId + 1, run.endedAt ?? undefined))
}

/**
 * 一次运行要显示的完整日志：进度帧 + 收尾。任务在跑时收尾为空，随状态更新自然长出来。
 *
 * 帧是参数而不是 `run.frames`：帧走单独的攒批通道（见 `@/stores/run-logs`），
 * 运行元数据里没有它，这里便由调用方按运行编号取来。
 */
function formatRunLogs(run: CorexRun, frames: readonly CorexFrame[], stepTotal: number): RunLog[] {
  const entries = formatFrames(frames)
  return entries.concat(formatOutcome(run, stepTotal, entries.length))
}

/** 复制日志用的一整段纯文本：时间和级别都带上，多行块保持原样 */
function formatLogText(entries: readonly RunLog[]): string {
  return entries
    .map(function (entry) {
      return `${entry.time} [${entry.level.toUpperCase()}] ${entry.message}`
    })
    .join('\n')
}

export { formatFrames, formatLogText, formatRunLogs }
