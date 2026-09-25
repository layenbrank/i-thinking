import { randomUUID } from 'node:crypto'
import { existsSync, realpathSync, statSync } from 'node:fs'
import path from 'node:path'

import { and, asc, desc, eq, isNull } from 'drizzle-orm'

import { workspace, workspaceFolder } from '../../../drizzle/schema'
import { WORKSPACE_COLOR, WORKSPACE_ICON } from '../../shared/workspace-icons'
import type { CHANNELS } from '../../shared/ipc/channels'
import { IpcError } from '../../shared/ipc/error'
import { type In, type Out } from '../../shared/ipc/specs'
import { findClient } from './database'
import { listEntries, readTextFile, searchEntries } from './workspace-path'
import { listSkills } from './workspace-skills'

type WorkspaceReadR = Out<typeof CHANNELS.WORKSPACE.READ>[number]
type WorkspaceWriteP = In<typeof CHANNELS.WORKSPACE.WRITE>
type WorkspaceUpdateP = In<typeof CHANNELS.WORKSPACE.UPDATE>
type WorkspaceIDP = In<typeof CHANNELS.WORKSPACE.REMOVE>
type FolderWriteP = In<typeof CHANNELS.WORKSPACE.FOLDERS.WRITE>
type FolderUpdateP = In<typeof CHANNELS.WORKSPACE.FOLDERS.UPDATE>
type FolderRemoveP = In<typeof CHANNELS.WORKSPACE.FOLDERS.REMOVE>
type FolderR = Out<typeof CHANNELS.WORKSPACE.FOLDERS.WRITE>
type ListDirP = In<typeof CHANNELS.WORKSPACE.LIST_DIR>
type DirEntryR = Out<typeof CHANNELS.WORKSPACE.LIST_DIR>[number]
type SearchP = In<typeof CHANNELS.WORKSPACE.SEARCH>
type SearchHitR = Out<typeof CHANNELS.WORKSPACE.SEARCH>[number]
type ReadFileP = In<typeof CHANNELS.WORKSPACE.READ_FILE>
type FileContentR = Out<typeof CHANNELS.WORKSPACE.READ_FILE>
type ListSkillsP = In<typeof CHANNELS.WORKSPACE.LIST_SKILLS>
type SkillR = Out<typeof CHANNELS.WORKSPACE.LIST_SKILLS>[number]

function findDefaultTitle(target: string): string {
  return path.basename(target) || target
}

function assertDirectory(target: string): string {
  if (!existsSync(target)) {
    throw new IpcError('WORKSPACE_PATH_UNAVAILABLE', `目录不存在: ${target}`)
  }
  if (!statSync(target).isDirectory()) {
    throw new IpcError('WORKSPACE_PATH_UNAVAILABLE', `不是目录: ${target}`)
  }
  return realpathSync(target)
}

/**
 * 工作区（多文件夹）读写。
 *
 * 沙箱边界取 primary folder 的绝对路径；渲染进程永远只传 workspaceID + 相对路径。
 */
class WorkspaceService {
  async toRead(includeArchived = false): Promise<WorkspaceReadR[]> {
    const db = findClient()
    const rows = includeArchived
      ? await db.select().from(workspace).orderBy(asc(workspace.sort))
      : await db
          .select()
          .from(workspace)
          .where(isNull(workspace.archivedAt))
          .orderBy(asc(workspace.sort))

    const folders = await db.select().from(workspaceFolder).orderBy(asc(workspaceFolder.sort))
    const byWorkspace = new Map<string, typeof folders>()
    for (const folder of folders) {
      const list = byWorkspace.get(folder.workspaceID) ?? []
      list.push(folder)
      byWorkspace.set(folder.workspaceID, list)
    }

    return rows.map(function (row) {
      return toWorkspaceRead(row, byWorkspace.get(row.id) ?? [])
    })
  }

  async toWrite(input: WorkspaceWriteP): Promise<WorkspaceReadR> {
    const db = findClient()
    const now = new Date()
    const workspaceID = randomUUID()
    const paths = input.folders.map(function (folder) {
      return assertDirectory(folder.path)
    })
    await assertPathsUnique(paths)

    const primaryIndex = Math.max(
      0,
      input.folders.findIndex(function (folder) {
        return folder.isPrimary
      })
    )

    const existing = await db.select().from(workspace)
    await db.insert(workspace).values({
      id: workspaceID,
      title: input.title.trim() || findDefaultTitle(paths[primaryIndex]),
      icon: input.icon ?? WORKSPACE_ICON,
      color: input.color ?? WORKSPACE_COLOR,
      pinned: false,
      archivedAt: null,
      sort: existing.length,
      createdAt: now,
      updatedAt: now
    })

    for (const [index, absolute] of paths.entries()) {
      await db.insert(workspaceFolder).values({
        id: randomUUID(),
        workspaceID,
        path: absolute,
        isPrimary: index === primaryIndex,
        sort: index,
        createdAt: now,
        updatedAt: now
      })
    }

    return this.requireWorkspace(workspaceID)
  }

  async toUpdate(input: WorkspaceUpdateP): Promise<WorkspaceReadR> {
    const db = findClient()
    const now = new Date()
    const current = await this.requireWorkspaceRow(input.id, true)

    await db
      .update(workspace)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
        ...(input.sort !== undefined ? { sort: input.sort } : {}),
        ...(input.archived !== undefined
          ? { archivedAt: input.archived ? (current.archivedAt ?? now) : null }
          : {}),
        updatedAt: now
      })
      .where(eq(workspace.id, input.id))

    if (input.folders) {
      const paths = input.folders.map(function (folder) {
        return assertDirectory(folder.path)
      })
      await assertPathsUnique(paths, input.id)

      const primaryIndex = Math.max(
        0,
        input.folders.findIndex(function (folder) {
          return folder.isPrimary
        })
      )

      await db.delete(workspaceFolder).where(eq(workspaceFolder.workspaceID, input.id))
      for (const [index, absolute] of paths.entries()) {
        await db.insert(workspaceFolder).values({
          id: input.folders[index].id ?? randomUUID(),
          workspaceID: input.id,
          path: absolute,
          isPrimary: index === primaryIndex,
          sort: index,
          createdAt: current.createdAt,
          updatedAt: now
        })
      }
    }

    // 归档工作区也要能读回（取消归档是恢复的唯一入口），所以按更新后的状态决定可见性
    const archived = input.archived ?? current.archivedAt !== null
    return this.requireWorkspace(input.id, archived)
  }

  async toRemove(input: WorkspaceIDP): Promise<void> {
    const rows = await findClient().delete(workspace).where(eq(workspace.id, input.id)).returning()
    if (rows.length === 0) {
      throw new IpcError('WORKSPACE_NOT_FOUND', `工作区不存在: ${input.id}`)
    }
  }

  async toArchive(input: WorkspaceIDP): Promise<WorkspaceReadR> {
    const rows = await findClient()
      .update(workspace)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(workspace.id, input.id))
      .returning()
    if (rows.length === 0) {
      throw new IpcError('WORKSPACE_NOT_FOUND', `工作区不存在: ${input.id}`)
    }
    return this.requireWorkspace(input.id, true)
  }

  async toWriteFolder(input: FolderWriteP): Promise<FolderR> {
    const absolute = assertDirectory(input.path)
    await assertPathsUnique([absolute])
    await this.requireWorkspaceRow(input.workspaceID)

    const db = findClient()
    const existing = await db
      .select()
      .from(workspaceFolder)
      .where(eq(workspaceFolder.workspaceID, input.workspaceID))
    const now = new Date()
    const isPrimary = input.isPrimary === true || existing.length === 0

    if (isPrimary) {
      await db
        .update(workspaceFolder)
        .set({ isPrimary: false, updatedAt: now })
        .where(eq(workspaceFolder.workspaceID, input.workspaceID))
    }

    const created = await db
      .insert(workspaceFolder)
      .values({
        id: randomUUID(),
        workspaceID: input.workspaceID,
        path: absolute,
        isPrimary,
        sort: existing.length,
        createdAt: now,
        updatedAt: now
      })
      .returning()

    return toFolder(created[0])
  }

  async toUpdateFolder(input: FolderUpdateP): Promise<FolderR> {
    const db = findClient()
    const rows = await db
      .select()
      .from(workspaceFolder)
      .where(eq(workspaceFolder.id, input.id))
      .limit(1)
    if (rows.length === 0) {
      throw new IpcError('WORKSPACE_FOLDER_NOT_FOUND', `源文件夹不存在: ${input.id}`)
    }

    const now = new Date()
    if (input.isPrimary === true) {
      await db
        .update(workspaceFolder)
        .set({ isPrimary: false, updatedAt: now })
        .where(eq(workspaceFolder.workspaceID, rows[0].workspaceID))
    }

    const updated = await db
      .update(workspaceFolder)
      .set({
        ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
        ...(input.sort !== undefined ? { sort: input.sort } : {}),
        updatedAt: now
      })
      .where(eq(workspaceFolder.id, input.id))
      .returning()

    return toFolder(updated[0])
  }

  async toRemoveFolder(input: FolderRemoveP): Promise<void> {
    const db = findClient()
    const rows = await db
      .select()
      .from(workspaceFolder)
      .where(eq(workspaceFolder.id, input.id))
      .limit(1)
    if (rows.length === 0) {
      throw new IpcError('WORKSPACE_FOLDER_NOT_FOUND', `源文件夹不存在: ${input.id}`)
    }

    const siblings = await db
      .select()
      .from(workspaceFolder)
      .where(eq(workspaceFolder.workspaceID, rows[0].workspaceID))
    if (siblings.length <= 1) {
      throw new IpcError('WORKSPACE_FOLDER_REQUIRED', '工作区至少保留一个源文件夹')
    }

    await db.delete(workspaceFolder).where(eq(workspaceFolder.id, input.id))

    if (rows[0].isPrimary) {
      const next = siblings.find(function (item) {
        return item.id !== input.id
      })
      if (next) {
        await db
          .update(workspaceFolder)
          .set({ isPrimary: true, updatedAt: new Date() })
          .where(eq(workspaceFolder.id, next.id))
      }
    }
  }

  async listDir(input: ListDirP): Promise<DirEntryR[]> {
    const root = await this.requirePrimaryPath(input.workspaceID)
    return listEntries(root, input.relative ?? '')
  }

  async search(input: SearchP): Promise<SearchHitR[]> {
    const root = await this.requirePrimaryPath(input.workspaceID)
    return searchEntries(root, input.query, input.limit)
  }

  async readFile(input: ReadFileP): Promise<FileContentR> {
    const root = await this.requirePrimaryPath(input.workspaceID)
    return {
      path: path.join(root, input.relative),
      relative: input.relative,
      content: readTextFile(root, input.relative)
    }
  }

  async listSkills(input: ListSkillsP): Promise<SkillR[]> {
    const root = await this.requirePrimaryPath(input.workspaceID)
    return listSkills(root)
  }

  async requirePrimaryPath(workspaceID: string): Promise<string> {
    const folder = await this.requirePrimaryFolder(workspaceID)
    if (!existsSync(folder.path)) {
      throw new IpcError('WORKSPACE_PATH_UNAVAILABLE', `工作区目录已不可用: ${folder.path}`)
    }
    return folder.path
  }

  private async requirePrimaryFolder(workspaceID: string) {
    await this.requireWorkspaceRow(workspaceID)
    const rows = await findClient()
      .select()
      .from(workspaceFolder)
      .where(and(eq(workspaceFolder.workspaceID, workspaceID), eq(workspaceFolder.isPrimary, true)))
      .limit(1)

    if (rows.length === 0) {
      const any = await findClient()
        .select()
        .from(workspaceFolder)
        .where(eq(workspaceFolder.workspaceID, workspaceID))
        .orderBy(asc(workspaceFolder.sort))
        .limit(1)
      if (any.length === 0) {
        throw new IpcError('WORKSPACE_FOLDER_REQUIRED', `工作区没有源文件夹: ${workspaceID}`)
      }
      return any[0]
    }
    return rows[0]
  }

  private async requireWorkspaceRow(id: string, includeArchived = false) {
    const rows = await findClient().select().from(workspace).where(eq(workspace.id, id)).limit(1)
    if (rows.length === 0) {
      throw new IpcError('WORKSPACE_NOT_FOUND', `工作区不存在: ${id}`)
    }
    if (!includeArchived && rows[0].archivedAt) {
      throw new IpcError('WORKSPACE_NOT_FOUND', `工作区已归档: ${id}`)
    }
    return rows[0]
  }

  private async requireWorkspace(id: string, includeArchived = false): Promise<WorkspaceReadR> {
    const row = await this.requireWorkspaceRow(id, includeArchived)
    const folders = await findClient()
      .select()
      .from(workspaceFolder)
      .where(eq(workspaceFolder.workspaceID, id))
      .orderBy(asc(workspaceFolder.sort))
    return toWorkspaceRead(row, folders)
  }
}

function toFolder(row: { id: string; path: string; isPrimary: boolean; sort: number }): FolderR {
  return {
    id: row.id,
    path: row.path,
    isPrimary: row.isPrimary,
    sort: row.sort
  }
}

function toWorkspaceRead(
  row: {
    id: string
    title: string
    icon: string
    color: string
    pinned: boolean
    archivedAt: Date | null
    sort: number
    createdAt: Date
    updatedAt: Date
  },
  folders: Array<{ id: string; path: string; isPrimary: boolean; sort: number }>
): WorkspaceReadR {
  const primary = folders.find(function (folder) {
    return folder.isPrimary
  })
  return {
    id: row.id,
    title: row.title,
    icon: row.icon,
    color: row.color,
    pinned: row.pinned,
    archived: row.archivedAt !== null,
    sort: row.sort,
    folders: folders.map(toFolder),
    primaryPath: primary?.path ?? folders[0]?.path ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}

/**
 * 「当前工作区」在运行时的样子：agent 引擎（要一个真能跑的工作目录）与聊天落库
 * （要一个存在的 workspaceID 外键）必须拿到同一个答案。
 */
interface WorkspaceTarget {
  id: string
  title: string
  /** 主根目录：agent 的工作目录，也是模型默认的沙箱边界 */
  primaryPath: string
  /** 全部根目录（primary 在前），只有磁盘上还存在的 */
  folders: string[]
}

/** 未归档工作区 + 各自的根目录，按左栏展示顺序返回 */
async function findAllWorkspaceTargets(): Promise<WorkspaceTarget[]> {
  const db = findClient()
  const rows = await db
    .select({ id: workspace.id, title: workspace.title })
    .from(workspace)
    .where(isNull(workspace.archivedAt))
    .orderBy(asc(workspace.sort))
  if (rows.length === 0) return []

  const folders = await db
    .select()
    .from(workspaceFolder)
    .orderBy(desc(workspaceFolder.isPrimary), asc(workspaceFolder.sort))

  const grouped = new Map<string, string[]>()
  for (const folder of folders) {
    const paths = grouped.get(folder.workspaceID)
    if (paths) paths.push(folder.path)
    else grouped.set(folder.workspaceID, [folder.path])
  }

  const targets: WorkspaceTarget[] = []
  for (const row of rows) {
    const paths = grouped.get(row.id) ?? []
    const primaryPath = paths[0]
    // 没有根目录的工作区当不了运行目标：模型没有落点
    if (!primaryPath) continue
    targets.push({ id: row.id, title: row.title, primaryPath, folders: paths })
  }
  return targets
}

/**
 * 工作区指针的**唯一**解析处。
 *
 * 渲染进程送来的 id 不能直接信：store 是异步水合的（首启、开新窗前可能还是 null），
 * 用户删掉工作区后指针还会悬空（`removeWorkspace` 不清指针）。这种值直接落库就是
 * 「外键悬空 → 会话与消息都写不进去 → 界面里聊过、库里是空的」。所以：请求的 id
 * 有效就用它，否则回落到第一个未归档工作区，一个都没有才返回 null。
 */
async function resolveWorkspaceID(requested?: string | null): Promise<string | null> {
  const targets = await findAllWorkspaceTargets()
  const match = targets.find(function (target) {
    return target.id === requested
  })
  return (match ?? targets[0])?.id ?? null
}

/**
 * agent 运行目标：目录必须**真的在磁盘上**（模型的一切读写都落在它上面）。
 *
 * 解析不到就是 null，由调用方直白报错 —— **不能**悄悄退到别处：历史上这里退到 studio
 * 私有沙箱，结果是模型看不到工作区，只好从盘符根开始全盘找用户提到的目录，而且工作区里
 * 的每个路径都成了「工作区外」，连自动审批档也要为它们弹审批。
 */
async function resolveWorkspaceTarget(requested?: string | null): Promise<WorkspaceTarget | null> {
  const targets = await findAllWorkspaceTargets()
  const usable = targets
    .map(function (target) {
      return { ...target, folders: target.folders.filter(existsSync) }
    })
    .filter(function (target) {
      return target.folders.length > 0
    })

  const match = usable.find(function (target) {
    return target.id === requested
  })
  const chosen = match ?? usable[0]
  if (!chosen) return null
  // primary 没了好用下一个根兜底，反正它已经在磁盘上
  return { ...chosen, primaryPath: chosen.folders[0] }
}

/**
 * 全部工作区的根目录（去重）。
 *
 * opencode 的会话只有一个工作目录，工作区里的第二个根在它眼里属于「工作区外」；
 * 这份清单用来把用户自己登记的根显式授权回去。
 */
async function findAllWorkspaceFolders(): Promise<string[]> {
  const targets = await findAllWorkspaceTargets()
  const paths = new Set<string>()
  for (const target of targets) {
    for (const folder of target.folders) paths.add(folder)
  }
  return [...paths]
}

async function assertPathsUnique(paths: string[], excludeWorkspaceID?: string) {
  const db = findClient()
  for (const absolute of paths) {
    const hits = await db
      .select()
      .from(workspaceFolder)
      .where(eq(workspaceFolder.path, absolute))
      .limit(1)
    if (hits.length === 0) continue
    if (excludeWorkspaceID && hits[0].workspaceID === excludeWorkspaceID) continue
    throw new IpcError('WORKSPACE_PATH_DUPLICATE', `目录已在工作区里: ${absolute}`)
  }
}

export { WorkspaceService, findAllWorkspaceFolders, resolveWorkspaceID, resolveWorkspaceTarget }
export type { DirEntryR, FileContentR, SearchHitR, WorkspaceReadR, WorkspaceTarget }
