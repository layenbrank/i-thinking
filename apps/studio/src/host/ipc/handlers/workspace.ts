import { CHANNELS } from '../../../shared/ipc/channels'
import { workspaceChangeJournal } from '../../capabilities/workspace-changes'
import { WorkspaceGitService } from '../../capabilities/workspace-git'
import { WorkspaceService } from '../../capabilities/workspace'
import { type DomainHandlers } from '../types'

/**
 * 工作区域：工作区 + 源文件夹由主进程落库；目录/文件/git/变更一律走
 * 「workspaceID + 相对路径」，越界与绝对路径在主进程被拒。
 */
export function buildWorkspaceHandlers(): DomainHandlers<'workspace'> {
  const workspace = new WorkspaceService()
  const git = new WorkspaceGitService(workspace)

  return {
    [CHANNELS.WORKSPACE.READ]: function (input) {
      return workspace.toRead(input?.includeArchived ?? false)
    },
    [CHANNELS.WORKSPACE.WRITE]: function (input) {
      return workspace.toWrite(input)
    },
    [CHANNELS.WORKSPACE.UPDATE]: function (input) {
      return workspace.toUpdate(input)
    },
    [CHANNELS.WORKSPACE.REMOVE]: function (input) {
      return workspace.toRemove(input)
    },
    [CHANNELS.WORKSPACE.ARCHIVE]: function (input) {
      return workspace.toArchive(input)
    },

    [CHANNELS.WORKSPACE.FOLDERS.WRITE]: function (input) {
      return workspace.toWriteFolder(input)
    },
    [CHANNELS.WORKSPACE.FOLDERS.UPDATE]: function (input) {
      return workspace.toUpdateFolder(input)
    },
    [CHANNELS.WORKSPACE.FOLDERS.REMOVE]: function (input) {
      return workspace.toRemoveFolder(input)
    },

    [CHANNELS.WORKSPACE.LIST_DIR]: function (input) {
      return workspace.listDir(input)
    },
    [CHANNELS.WORKSPACE.SEARCH]: function (input) {
      return workspace.search(input)
    },
    [CHANNELS.WORKSPACE.READ_FILE]: function (input) {
      return workspace.readFile(input)
    },
    [CHANNELS.WORKSPACE.LIST_SKILLS]: function (input) {
      return workspace.listSkills(input)
    },

    [CHANNELS.WORKSPACE.GIT.PROBE]: function (input) {
      return git.probe(input)
    },
    [CHANNELS.WORKSPACE.GIT.BRANCHES]: function (input) {
      return git.branches(input)
    },
    [CHANNELS.WORKSPACE.GIT.CHECKOUT]: function (input) {
      return git.checkout(input)
    },

    [CHANNELS.WORKSPACE.CHANGES.READ]: function (input) {
      return workspaceChangeJournal.toRead(input)
    },
    [CHANNELS.WORKSPACE.CHANGES.PATCH]: function (input) {
      return workspaceChangeJournal.toReadPatch(input)
    },
    [CHANNELS.WORKSPACE.CHANGES.UNDO]: function (input) {
      return workspaceChangeJournal.toUndo(input)
    }
  }
}
