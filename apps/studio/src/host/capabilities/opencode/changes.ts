import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * 会话内的文件变更汇总（「已编辑 N 个文件」那张卡）。
 *
 * 数据来自 opencode v2 的 `session.diff({ sessionID })`：一次调用返回**全量**变更，
 * 一条 = `{file, patch, additions, deletions, status}`。两条实测出来的硬约束：
 *
 * 1. v1 的 `session.diff` 不传 `messageID` 恒返回 `[]`，得先把用户消息列出来逐条问；
 *    v2 去掉了这个参数（`session.diff({sessionID})` 就是全量），所以这里不再需要遍历消息；
 * 2. 只有**工作区是 git 仓库**时 opencode 才打文件快照（snapshot 依赖 `vcs === "git"`），
 *    非 git 工作区里 `step-start` 不挂 snapshot，于是永远算不出 diff —— 不是 studio 的 bug。
 *
 * 返回的 `patch` 是 unified diff，撤销不用另外留快照：把 patch 逆向套回当前文件就是
 * 「改之前」的样子。撤销走「写回文件」而不是 `session.revert` —— 后者会连同对话一起回退，
 * 而用户点的是「撤销这些文件改动」，不该顺手删掉聊天记录。
 */

/**
 * opencode `session.diff` 的一条（v2 的 `FileDiffInfo`）：`{file, patch, additions, deletions, status}`。
 *
 * 这里不 import SDK 类型：一是不想让单测被 SDK 的运行时依赖拖住，二是字段是按**实际响应**
 * 校正过的（v2 早期文档里的 `FileDiff` 声明过 `{before, after}`，与运行时不一致）。
 */
interface FileDiff {
  file: string
  patch: string
  additions: number
  deletions: number
  status?: string
}

interface ChangeEntry {
  id: string
  path: string
  created: boolean
  added: number
  removed: number
  /** 文件当前内容已经对不上这条变更（撤销过 / 被改过），界面据此弱化或隐藏 */
  undone: boolean
}

interface ChangeReport {
  entries: ChangeEntry[]
  added: number
  removed: number
}

/** 撤销一个文件的结果：写回内容、删掉新建的文件、或没法安全回退 */
type UndoResult =
  | { kind: 'restore'; content: string }
  | { kind: 'delete' }
  | { kind: 'unsupported'; reason: string }

const EMPTY_REPORT: ChangeReport = { entries: [], added: 0, removed: 0 }

/** 单个文件 patch 总量超过这个字符数就不做「还在不在」判断：轮询里不值得反复解析大 diff */
const LIVE_CHECK_MAX_CHARS = 200_000

/** 按需取 patch 时返回给渲染进程的上限；超出部分截断并附提示行 */
const PATCH_MAX_CHARS = 200_000

/** 归一化：绝对路径换成相对工作区的路径，分隔符统一成 `/`（界面直接显示） */
function toRelativePath(rootPath: string, file: string): string {
  const relative = path.isAbsolute(file) ? path.relative(rootPath, file) : file
  return relative.split(path.sep).join('/')
}

/** 运行时返回的一条变更 → 我们的形状；拿不到文件名就丢掉 */
function toFileDiff(raw: unknown): FileDiff | null {
  if (typeof raw !== 'object' || raw === null) return null

  const item = raw as {
    file?: unknown
    patch?: unknown
    additions?: unknown
    deletions?: unknown
    status?: unknown
  }
  if (typeof item.file !== 'string') return null

  return {
    file: item.file,
    patch: typeof item.patch === 'string' ? item.patch : '',
    additions: typeof item.additions === 'number' ? item.additions : 0,
    deletions: typeof item.deletions === 'number' ? item.deletions : 0,
    ...(typeof item.status === 'string' ? { status: item.status } : {})
  }
}

/**
 * 读文件当前内容，供「变更还在不在」判断用。
 *
 * 三种结果各有含义：内容 / `null`（文件不存在）/ `undefined`（判不了：太大或被占用，
 * 这时一律按「变更仍生效」处理，绝不因为读不到就说人家撤销了）。
 */
function readCurrentText(absolutePath: string): string | null | undefined {
  if (!existsSync(absolutePath)) return null

  try {
    if (statSync(absolutePath).size > LIVE_CHECK_MAX_CHARS) return undefined
    return readFileSync(absolutePath, 'utf8')
  } catch (error) {
    // 读不了（被占用 / 权限）：判不了「还在不在」，按仍生效处理，只留痕
    console.warn('[opencode] 读取文件失败，跳过变更存活性判断', absolutePath, error)
    return undefined
  }
}

/** 按 `\n` 切行并保留 `\r`：CRLF 文件的行尾是内容的一部分，比较时要一模一样 */
function splitLines(text: string): string[] {
  return text.split('\n')
}

/** 一个 hunk 里的原始行（带 ` `、`+`、`-` 前缀），解析不出 hunk 就返回 `null` */
function parsePatch(patch: string): string[][] | null {
  const hunks: string[][] = []
  let current: string[] | null = null

  for (const line of patch.split('\n')) {
    if (line.startsWith('@@')) {
      current = []
      hunks.push(current)
      continue
    }
    // hunk 之前的 `diff --git` / `Index:` / `---` / `+++` 都不是内容
    if (!current) continue
    if (line.startsWith('\\')) continue
    if (line.length === 0) continue
    current.push(line)
  }

  return hunks.length > 0 ? hunks : null
}

function isOldSide(line: string): boolean {
  return line.startsWith(' ') || line.startsWith('-')
}

function isNewSide(line: string): boolean {
  return line.startsWith(' ') || line.startsWith('+')
}

/** 去掉 ` `、`+`、`-` 前缀，剩下的才是真正的行内容 */
function toContent(line: string): string {
  return line.slice(1)
}

/** 在 `lines` 里找 `needle` 连续出现的位置，找不到返回 -1 */
function findBlock(lines: readonly string[], needle: readonly string[]): number {
  if (needle.length === 0) return -1
  if (needle.length > lines.length) return -1

  for (let start = 0; start + needle.length <= lines.length; start += 1) {
    let matched = true
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (lines[start + offset] !== needle[offset]) {
        matched = false
        break
      }
    }
    if (matched) return start
  }

  return -1
}

/**
 * 逆向套用一个 patch：把「新」一侧换回「旧」一侧。套不上返回 `null` —— 宁可报错，
 * 也绝不猜着写回一个错的版本。
 */
function reverseApply(content: string, patch: string): string | null {
  const hunks = parsePatch(patch)
  if (!hunks) return null

  let lines = splitLines(content)

  for (const hunk of hunks) {
    const before = hunk.filter(isOldSide).map(toContent)
    const after = hunk.filter(isNewSide).map(toContent)

    // 整个文件是新增的（没有上下文行）：逆向 = 内容清空
    if (after.length === 0) {
      if (hunks.length === 1 && lines.length <= 1 && (lines[0] ?? '') === '') {
        return before.join('\n')
      }
      return null
    }

    const at = findBlock(lines, after)
    if (at < 0) return null

    lines = lines.slice(0, at).concat(before, lines.slice(at + after.length))
  }

  return lines.join('\n')
}

/**
 * 把一条文件在本次会话里经历的所有 patch（按时间正序传入）逆着套回去。
 *
 * v2 的 `session.diff` 多数时候一个文件只给一条**累计** patch（快照 → 当前），此时循环
 * 只跑一轮；写成「从最新往最早逐条抵消」是为了兼容服务端按消息粒度返回多条的情形 ——
 * 每条 patch 都是相对它自己那轮开始时的快照算的，只有先抵消最新的那次改动，
 * 前一条的上下文才对得上。
 */
function applyChain(current: string, patches: readonly FileDiff[]): UndoResult {
  if (patches.length === 0) return { kind: 'unsupported', reason: '没有可用的变更记录' }

  // 会话开始前这个文件不存在：撤销 = 删掉它（否则会留下一个空文件）
  if (patches[0]?.status === 'added') return { kind: 'delete' }

  let text = current
  for (let index = patches.length - 1; index >= 0; index -= 1) {
    const patch = patches[index]
    if (!patch) continue

    const next = reverseApply(text, patch.patch)
    if (next === null) {
      return { kind: 'unsupported', reason: '文件当前内容和变更记录对不上，无法精确回退' }
    }
    text = next
  }

  return { kind: 'restore', content: text }
}

/** 这条变更是否还「生效」：能被完整逆向套回就说明文件还是它改完的样子 */
function isLive(current: string, patches: readonly FileDiff[]): boolean {
  const total = patches.reduce(function (sum, patch) {
    return sum + patch.patch.length
  }, 0)
  if (total > LIVE_CHECK_MAX_CHARS) return true

  return applyChain(current, patches).kind !== 'unsupported'
}

/**
 * 汇总成界面要的报表。按文件分组，一个文件一条：多个 patch 取**最新那条**的增删行数
 * （界面显示的是「这个文件现在多了/少了多少行」），是否新建看**最早那条**的 status。
 *
 * v2 的 `session.diff` 通常已经是一个文件一条，所以分组多数时候是恒等变换；
 * 但它同时也兜住了「服务端按消息粒度返回」或后续再变形状的情况。
 *
 * `readCurrent` 给了才做「还在不在」判断；不传就是「照单全收」（单测与降级路径）。
 */
function toChangeReport(
  diffs: readonly FileDiff[],
  rootPath: string,
  readCurrent?: (relativePath: string) => string | null | undefined
): ChangeReport {
  const groups = new Map<string, FileDiff[]>()
  for (const diff of diffs) {
    const relative = toRelativePath(rootPath, diff.file)
    const list = groups.get(relative)
    if (list) list.push(diff)
    else groups.set(relative, [diff])
  }

  const entries: ChangeEntry[] = []
  let added = 0
  let removed = 0

  for (const [relative, patches] of groups) {
    const latest = patches[patches.length - 1]
    const created = patches[0]?.status === 'added'
    const additions = latest?.additions ?? 0
    const deletions = latest?.deletions ?? 0

    let undone = false
    if (readCurrent) {
      const current = readCurrent(relative)
      if (current === undefined) undone = false
      // 文件没了：只有「删文件」这条变更还算生效，别的都当作已被撤销
      else if (current === null) undone = latest?.status !== 'deleted'
      else undone = !isLive(current, patches)
    }

    entries.push({
      id: relative,
      path: relative,
      created,
      added: additions,
      removed: deletions,
      undone
    })

    if (!undone) {
      added += additions
      removed += deletions
    }
  }

  return { entries, added, removed }
}

/**
 * 单个文件的 unified diff 原文 —— 「变更卡」里点开某一行的按需内容。
 *
 * 取**最新那条** patch，与报表里 `+/-` 的口径一致（同一个文件被改多次时，
 * 界面显示的行数本来就取自最新那条）。路径不命中就返回空串：变更可能已经被撤销、
 * 或者服务端不再报它，不是错误。
 *
 * 上限不是安全边界而是传输边界：patch 走 IPC 进渲染进程，超大 diff 会让整条消息变得很重，
 * 截断处补一行说明，界面据此提示「已截断」。
 */
function toPatchText(
  diffs: readonly FileDiff[],
  rootPath: string,
  relativePath: string,
  maxChars = PATCH_MAX_CHARS
): string {
  const matched = diffs.filter(function (diff) {
    return toRelativePath(rootPath, diff.file) === relativePath
  })
  const latest = matched[matched.length - 1]
  if (!latest) return ''

  const patch = latest.patch ?? ''
  if (patch.length <= maxChars) return patch

  return `${patch.slice(0, maxChars)}\n\n… diff 过大，已截断（共 ${patch.length} 字符）`
}

/**
 * 落地一条撤销。
 *
 * 越界防护交给调用方（`resolveInside`）：这里的路径一定来自 opencode 的 diff，
 * 也就是它真的改过的文件，但仍按「可能被篡改的输入」对待。
 */
function applyUndo(absolutePath: string, result: UndoResult): void {
  if (result.kind === 'unsupported') throw new Error(result.reason)

  if (result.kind === 'delete') {
    if (existsSync(absolutePath)) rmSync(absolutePath, { force: true })
    return
  }

  writeFileSync(absolutePath, result.content, 'utf8')
}

export {
  applyChain,
  applyUndo,
  EMPTY_REPORT,
  readCurrentText,
  reverseApply,
  toChangeReport,
  toFileDiff,
  toPatchText,
  toRelativePath
}
export type { ChangeEntry, ChangeReport, FileDiff, UndoResult }
