import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import type { CHANNELS } from '../../shared/ipc/channels'
import { IpcError } from '../../shared/ipc/error'
import { type In, type Out } from '../../shared/ipc/specs'
import { WorkspaceService } from './workspace'

const execFileAsync = promisify(execFile)

type ProbeP = In<typeof CHANNELS.WORKSPACE.GIT.PROBE>
type ProbeR = Out<typeof CHANNELS.WORKSPACE.GIT.PROBE>
type BranchesR = Out<typeof CHANNELS.WORKSPACE.GIT.BRANCHES>
type CheckoutP = In<typeof CHANNELS.WORKSPACE.GIT.CHECKOUT>
type CheckoutR = Out<typeof CHANNELS.WORKSPACE.GIT.CHECKOUT>

/**
 * 工作区 Git：在 primary path 上跑本地 `git`。
 * 不做 worktree / 远程；只服务 Composer footer 的分支探测与切换。
 */
class WorkspaceGitService {
  private readonly workspace: WorkspaceService

  constructor(workspace: WorkspaceService) {
    this.workspace = workspace
  }

  async probe(input: ProbeP): Promise<ProbeR> {
    const cwd = await this.workspace.requirePrimaryPath(input.workspaceID)
    try {
      const inside = await runGit(cwd, ['rev-parse', '--is-inside-work-tree'])
      if (inside.trim() !== 'true') return { isRepo: false, branch: null }
      const branch = await runGit(cwd, ['branch', '--show-current'])
      return { isRepo: true, branch: branch.trim() || null }
    } catch {
      return { isRepo: false, branch: null }
    }
  }

  async branches(input: ProbeP): Promise<BranchesR> {
    const cwd = await this.workspace.requirePrimaryPath(input.workspaceID)
    try {
      const current = (await runGit(cwd, ['branch', '--show-current'])).trim()
      const raw = await runGit(cwd, ['branch', '--format=%(refname:short)'])
      const branches = raw
        .split('\n')
        .map(function (line) {
          return line.trim()
        })
        .filter(Boolean)
      return { current, branches }
    } catch (error) {
      throw new IpcError(
        'WORKSPACE_GIT_FAILED',
        error instanceof Error ? error.message : '列出分支失败'
      )
    }
  }

  async checkout(input: CheckoutP): Promise<CheckoutR> {
    const cwd = await this.workspace.requirePrimaryPath(input.workspaceID)
    try {
      await runGit(cwd, ['checkout', input.branch])
      const branch = (await runGit(cwd, ['branch', '--show-current'])).trim()
      return { branch }
    } catch (error) {
      const raw = findGitFailure(error)
      console.warn('[workspace-git] 切换分支失败', raw)
      throw new IpcError('WORKSPACE_GIT_FAILED', parseCheckoutFailure(raw, input.branch))
    }
  }
}

/** 把 git 的英文失败收成一句人话。脏工作区不能硬切，否则会盖掉未提交的文件。 */
function parseCheckoutFailure(raw: string, branch: string): string {
  const text = raw.toLowerCase()
  if (
    text.includes('would be overwritten') ||
    text.includes('please commit your changes or stash') ||
    text.includes('your local changes')
  ) {
    return `工作区还有未提交的改动，切到 ${branch} 会盖掉这些文件。先提交或暂存后再切。`
  }
  if (text.includes('did not match any file') || text.includes('pathspec')) {
    return `找不到分支 ${branch}`
  }
  return `切换到 ${branch} 失败`
}

function findGitFailure(error: unknown): string {
  if (!error || typeof error !== 'object') return String(error)
  const stderr = 'stderr' in error ? String(error.stderr ?? '') : ''
  const message = error instanceof Error ? error.message : ''
  return `${message}\n${stderr}`.trim()
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024
  })
  return stdout
}

export { WorkspaceGitService, parseCheckoutFailure }
