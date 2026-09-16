import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import type { CHANNELS } from '../../shared/ipc/channels'
import { IpcError } from '../../shared/ipc/error'
import { type In, type Out } from '../../shared/ipc/specs'
import { resolveInside } from './workspace-path'

type ChangesReadP = In<typeof CHANNELS.WORKSPACE.CHANGES.READ>
type ChangesUndoP = In<typeof CHANNELS.WORKSPACE.CHANGES.UNDO>
type ChangesR = Out<typeof CHANNELS.WORKSPACE.CHANGES.READ>

interface ChangeRecord {
  id: string
  sessionID: string
  rootPath: string
  path: string
  created: boolean
  added: number
  removed: number
  previousContent: string | null
  undone: boolean
}

/**
 * 会话级文件变更日记：`fs_write` 落盘前快照，供「已编辑 N 个文件」卡撤销。
 * 只活在主进程内存里 —— 重启窗口后清空是预期（磁盘已是最新内容）。
 */
class WorkspaceChangeJournal {
  private readonly records = new Map<string, ChangeRecord[]>()

  record(input: {
    sessionID: string
    rootPath: string
    relative: string
    nextContent: string
  }): { id: string; created: boolean; added: number; removed: number } {
    const absolute = resolveInside(input.rootPath, input.relative)
    const created = !existsSync(absolute)
    const previousContent = created ? null : readFileSync(absolute, 'utf8')
    const { added, removed } = countLineDiff(previousContent ?? '', input.nextContent)
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const entry: ChangeRecord = {
      id,
      sessionID: input.sessionID,
      rootPath: input.rootPath,
      path: input.relative.split(path.sep).join('/'),
      created,
      added,
      removed,
      previousContent,
      undone: false
    }

    const list = this.records.get(input.sessionID) ?? []
    list.push(entry)
    this.records.set(input.sessionID, list)
    return { id, created, added, removed }
  }

  toRead(input: ChangesReadP): ChangesR {
    return summarize(this.records.get(input.sessionID) ?? [])
  }

  toUndo(input: ChangesUndoP): ChangesR {
    const list = this.records.get(input.sessionID) ?? []
    const targets = input.changeID
      ? list.filter(function (item) {
          return item.id === input.changeID
        })
      : [...list].reverse()

    if (input.changeID && targets.length === 0) {
      throw new IpcError('WORKSPACE_CHANGE_NOT_FOUND', `变更不存在: ${input.changeID}`)
    }

    for (const entry of targets) {
      if (entry.undone) continue
      const absolute = resolveInside(entry.rootPath, entry.path)
      if (entry.previousContent === null) {
        try {
          if (existsSync(absolute)) unlinkSync(absolute)
        } catch (error) {
          console.warn('[workspace-changes] 撤销新建文件失败', error)
        }
      } else {
        writeFileSync(absolute, entry.previousContent, 'utf8')
      }
      entry.undone = true
      if (input.changeID) break
    }

    return summarize(list)
  }
}

function countLineDiff(before: string, after: string): { added: number; removed: number } {
  const a = before.length === 0 ? [] : before.split(/\r?\n/)
  const b = after.length === 0 ? [] : after.split(/\r?\n/)
  // 简化：按行集合差近似（够用做汇总卡数字；不做 Myers）
  const counts = new Map<string, number>()
  for (const line of a) counts.set(line, (counts.get(line) ?? 0) + 1)
  let removed = 0
  let added = 0
  for (const line of b) {
    const left = counts.get(line) ?? 0
    if (left > 0) counts.set(line, left - 1)
    else added += 1
  }
  for (const left of counts.values()) removed += left
  return { added, removed }
}

function summarize(list: readonly ChangeRecord[]): ChangesR {
  const active = list.filter(function (item) {
    return !item.undone
  })
  // 同一 path 只保留最后一次未撤销写入
  const latest = new Map<string, ChangeRecord>()
  for (const entry of active) latest.set(entry.path, entry)

  const entries = [...latest.values()].map(function (entry) {
    return {
      id: entry.id,
      path: entry.path,
      created: entry.created,
      added: entry.added,
      removed: entry.removed,
      undone: entry.undone
    }
  })

  return {
    entries,
    added: entries.reduce(function (sum, item) {
      return sum + item.added
    }, 0),
    removed: entries.reduce(function (sum, item) {
      return sum + item.removed
    }, 0)
  }
}

const workspaceChangeJournal = new WorkspaceChangeJournal()

export { countLineDiff, workspaceChangeJournal }
export type { ChangeRecord }
