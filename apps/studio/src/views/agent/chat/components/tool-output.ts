/**
 * 工具卡的取数与折叠（纯函数，无框架依赖）。
 *
 * opencode v2 的工具入参形状来自**实测**：`shell` 用 `{command, workdir?, timeout?, background?}`
 * （见 opencode 文档「Commands → Shell」），`execute` 是 Code Mode 的 JS 运行器，源码在哪个键
 * 上没有稳定承诺，所以按候选键表逐个试。认不出来就交回给通用卡渲染，不猜、不丢内容。
 */

/** 终端面板默认只铺这么多行，其余折叠起来（输出常常几百行，全铺会把消息流冲垮） */
const TERMINAL_PREVIEW_LINES = 20

/** Code Mode 的源码键候选（按优先级尝试） */
const CODE_KEYS = ['code', 'script', 'source', 'javascript'] as const

interface ShellCommand {
  command: string
  workdir: string | null
  /** `background: true` 表示它是个常驻进程（dev server 之类），不是一次性命令 */
  background: boolean
}

interface CollapsedOutput {
  lines: string[]
  /** 被折叠掉的行数；0 表示没有隐藏内容 */
  hidden: number
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

function firstString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

/** `shell` 的入参 → 终端要展示的东西；没有可执行命令时返回 null（交给通用卡） */
function toShellCommand(args: unknown): ShellCommand | null {
  const record = toRecord(args)
  if (!record) return null

  const command = firstString(record, ['command'])
  if (command === null) return null

  const workdir = record.workdir
  return {
    command,
    workdir: typeof workdir === 'string' && workdir.trim() ? workdir.trim() : null,
    background: record.background === true
  }
}

/** `execute`（Code Mode）的源码；认不出返回 null（交给通用卡） */
function toCodeSource(args: unknown): string | null {
  const record = toRecord(args)
  if (!record) return null
  return firstString(record, CODE_KEYS)
}

/**
 * 按行折叠。空白输出返回空数组（面板显示「无输出」而不是一片空白），
 * 末尾的换行不算一行 —— 否则每段输出都会凭空多一条空行。
 */
function collapseOutput(
  raw: string | null | undefined,
  maxLines = TERMINAL_PREVIEW_LINES
): CollapsedOutput {
  if (raw === null || raw === undefined) return { lines: [], hidden: 0 }

  const lines = raw.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n')
  if (lines.length === 1 && lines[0] === '') return { lines: [], hidden: 0 }
  if (lines.length <= maxLines) return { lines, hidden: 0 }

  return { lines: lines.slice(0, maxLines), hidden: lines.length - maxLines }
}

export { CODE_KEYS, collapseOutput, TERMINAL_PREVIEW_LINES, toCodeSource, toShellCommand }
export type { CollapsedOutput, ShellCommand }
