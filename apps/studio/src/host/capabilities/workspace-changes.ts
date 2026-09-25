import type { CHANNELS } from '../../shared/ipc/channels'
import type { In } from '../../shared/ipc/specs'
import { findEngineIfAny } from './opencode/engine'
import type { ChangeReport } from './opencode/engine'

/**
 * 会话内的文件变更（「已编辑 N 个文件」卡）。
 *
 * 变更的**记录方是 opencode**：改文件的是它，撤销所需的旧内容也只有它留着
 * （`session.diff` 的 `before`）。这里只做 IPC 到引擎的转发 —— 以前那套
 * `record()` / `previousContent` 自建日记是挂在 studio 自研 `fs_write` 工具上的，
 * 换引擎后没人再喂它，已随工具集一起退役。
 *
 * 界面契约不变：`{ entries, added, removed }`；`changeID` 即条目 `id`（相对路径）。
 */

type ChangesReadP = In<typeof CHANNELS.WORKSPACE.CHANGES.READ>
type ChangesPatchP = In<typeof CHANNELS.WORKSPACE.CHANGES.PATCH>
type ChangesUndoP = In<typeof CHANNELS.WORKSPACE.CHANGES.UNDO>

const EMPTY: ChangeReport = { entries: [], added: 0, removed: 0 }

class WorkspaceChangeJournal {
  /** 引擎还没建（本次进程没跑过 agent）→ 没有任何变更 */
  toRead(input: ChangesReadP): Promise<ChangeReport> {
    const engine = findEngineIfAny()
    if (!engine) return Promise.resolve(EMPTY)

    return engine.toReadChanges(input.sessionID)
  }

  /**
   * 单个文件的 diff 原文。清单只给「哪些文件 + 多少行」，正文按需取 ——
   * 轮询载荷里不能背 diff。
   */
  async toReadPatch(input: ChangesPatchP): Promise<{ patch: string }> {
    const engine = findEngineIfAny()
    if (!engine) return { patch: '' }

    return { patch: await engine.toReadPatch(input.sessionID, input.changeID) }
  }

  toUndo(input: ChangesUndoP): Promise<ChangeReport> {
    const engine = findEngineIfAny()
    if (!engine) return Promise.resolve(EMPTY)

    return engine.toUndoChanges(input.sessionID, input.changeID)
  }
}

const workspaceChangeJournal = new WorkspaceChangeJournal()

export { workspaceChangeJournal }
