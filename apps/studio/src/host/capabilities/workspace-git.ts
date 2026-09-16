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
      throw new IpcError(
        'WORKSPACE_GIT_FAILED',
        error instanceof Error ? error.message : `切换分支失败: ${input.branch}`
      )
    }
  }
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024
  })
  return stdout
}

export { WorkspaceGitService }
