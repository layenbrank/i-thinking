import { appendFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * 主进程日志落盘：`<userData>/logs/main-YYYY-MM-DD.log`，按天一个文件。
 *
 * 为什么需要：主进程的输出此前只进启动它的那个终端，用户报「发消息毫无反应 / 一直提示
 * 登录过期」时，现场就是那段早就滚掉的输出 —— 排查只能靠服务端日志反推。
 *
 * 为什么拦 `console` 而不是自己的 logger：出事时最想看的那几行往往不在 logger 里 ——
 * 入站校验失败时 zod 的字段路径是 `console.warn` 打的，第三方 SDK（opencode）也一样。
 *
 * 三条自我约束：
 * - 同步追加：退出时不留半行（异步流会把尾巴丢在 `app.exit` 之后），info 级日志量很小。
 * - 写不动就闭嘴：目录建不出、磁盘满 —— 降级成只走 stdout，绝不冒泡、不重试刷屏。
 * - 单日上限：到量后写一行说明就停，不留无限膨胀的文件。
 */

const MAX_FILE_BYTES = 4 * 1024 * 1024
const MAX_ARG_CHARS = 4000
const PATCHED_METHODS = ['debug', 'log', 'info', 'warn', 'error'] as const

type ConsoleMethod = (typeof PATCHED_METHODS)[number]
type ConsoleCall = (...args: unknown[]) => void

/** 按**本地**日期切分：用户看的是本地时间，跨时区用 UTC 反而对不上号 */
function toDayKey(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function findFileSize(file: string): number {
  try {
    return existsSync(file) ? statSync(file).size : 0
  } catch {
    return 0
  }
}

/** 把任意一个 console 参数压成一行文本 */
function formatArg(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.stack ?? value.message

  try {
    const encoded = JSON.stringify(value)
    return encoded === undefined ? String(value) : encoded
  } catch {
    // 循环引用等：`String()` 至少还留个大概，总比丢掉这一条强
    return String(value)
  }
}

function formatCall(args: unknown[]): string {
  const text = args.map(formatArg).join(' ')
  return text.length > MAX_ARG_CHARS ? `${text.slice(0, MAX_ARG_CHARS)}…（已截断）` : text
}

/** 挂上落盘出口；返回卸载函数（把 `console` 还原回去） */
function attachFileLog(dataDir: string): () => void {
  const dir = path.join(dataDir, 'logs')
  const consoleRef = console as unknown as Record<ConsoleMethod, ConsoleCall>
  const originals = new Map<ConsoleMethod, ConsoleCall>()

  let day = ''
  let file = ''
  let bytes = 0
  let isUsable = true
  let isCapped = false
  // 防递归：本模块自己的提示不能绕回来又写一遍
  let isWriting = false

  function append(text: string): void {
    try {
      appendFileSync(file, text)
    } catch (error) {
      isUsable = false
      originals.get('warn')?.(`[log-file] 写日志失败，后续只进 stdout: ${file}`, error)
    }
  }

  function roll(now: Date): void {
    const nextDay = toDayKey(now)
    if (nextDay === day) return

    day = nextDay
    file = path.join(dir, `main-${nextDay}.log`)
    bytes = findFileSize(file)
    isCapped = bytes >= MAX_FILE_BYTES

    try {
      mkdirSync(dir, { recursive: true })
    } catch (error) {
      isUsable = false
      originals.get('warn')?.(`[log-file] 日志目录不可用，日志只进 stdout: ${dir}`, error)
    }
  }

  function write(level: string, text: string): void {
    roll(new Date())
    if (!isUsable || isCapped) return

    // +1 是换行；按 UTF-8 字节算，中文日志才不会把上限算得比实际小一半
    bytes += Buffer.byteLength(text, 'utf8') + 1
    if (bytes > MAX_FILE_BYTES) {
      isCapped = true
      append(`--- 已达 ${MAX_FILE_BYTES} 字节上限，本日不再写入 ---\n`)
      return
    }

    append(`[${new Date().toISOString()}] [${level}] ${text}\n`)
  }

  for (const method of PATCHED_METHODS) {
    const original = consoleRef[method].bind(console)
    originals.set(method, original)

    consoleRef[method] = function (...args: unknown[]): void {
      // 先保住 stdout：终端是开发时的第一现场，落盘只是备份
      original(...args)

      if (isWriting) return
      isWriting = true
      try {
        write(method.toUpperCase(), formatCall(args))
      } finally {
        isWriting = false
      }
    }
  }

  write('INFO', `--- studio main 启动（日志目录 ${dir}）---`)

  return function detach(): void {
    for (const [method, original] of originals) consoleRef[method] = original
    originals.clear()
  }
}

export { attachFileLog }
