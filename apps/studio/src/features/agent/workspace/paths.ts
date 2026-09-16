/**
 * 工作区路径判定（渲染侧，纯函数）。
 *
 * 「添加文件 / 文件夹」走的是**系统对话框**，用户可能挑到工作区之外的东西；
 * 而 Agent 的 `fs_read` 只认根内相对路径。所以这里必须先判定归属，
 * 而不是把绝对路径当引用丢进去，让模型自己撞「路径越界」。
 *
 * 与主进程的 `workspace-path.ts` 同源但用途不同：那边做真实的沙箱校验（含符号链接），
 * 这边只为「能不能引用」给一个提前的、可解释的答案。
 */

const SLASH = '/'

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, SLASH).replace(/\/+$/, '')
}

function toBaseName(value: string): string {
  const parts = normalizeSlashes(value).split(SLASH)
  return parts.filter(Boolean).pop() ?? value
}

/**
 * 绝对路径 → 工作区内相对路径；不在工作区内返回 `null`。
 *
 * - 等于根自身时返回 `.`（调用方通常应跳过：工作区本来就在上下文里）
 * - Windows 盘符大小写不敏感，比较时统一小写，但**返回原样大小写**的相对部分
 */
function findWorkspaceRelative(absolutePath: string, rootPath: string): string | null {
  const target = normalizeSlashes(absolutePath)
  const root = normalizeSlashes(rootPath)
  if (!target || !root) return null

  const targetKey = target.toLowerCase()
  const rootKey = root.toLowerCase()
  if (targetKey === rootKey) return '.'
  // 拼上分隔符再比较，避免 /a/b 误判 /a/bc
  if (!targetKey.startsWith(`${rootKey}${SLASH}`)) return null

  return target.slice(root.length + 1)
}

interface WorkspacePicks {
  /** 可引用的根内相对路径（已去重） */
  relatives: string[]
  /** 被跳过的路径名：不在工作区内，或就是工作区本身 */
  skipped: string[]
}

/** 把一批系统对话框选中的路径收敛成「可引用的相对路径 + 被跳过的 + 原因」 */
function resolveWorkspacePicks(paths: readonly string[], rootPath: string): WorkspacePicks {
  const relatives: string[] = []
  const skipped: string[] = []

  for (const path of paths) {
    const relative = findWorkspaceRelative(path, rootPath)
    // 工作区本身不需要「引用」——它已经在上下文里了
    if (!relative || relative === '.') {
      skipped.push(toBaseName(path))
      continue
    }
    if (!relatives.includes(relative)) relatives.push(relative)
  }

  return { relatives, skipped }
}

export { findWorkspaceRelative, resolveWorkspacePicks, toBaseName }
export type { WorkspacePicks }
