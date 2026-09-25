import { z } from 'zod'

import type { ChannelOfDomain } from '../channels'
import { CHANNELS } from '../channels'
import type { ChannelSpec } from '../spec'

/**
 * 工作区域：Agent 的**沙箱边界**。
 *
 * 工作区与源文件夹由主进程持久化；渲染进程只能按 `workspaceID`（或 folderID）
 * + **相对路径**访问，绝对路径与越界路径一律由主进程拒绝。
 */

const FolderSchema = z.object({
  id: z.string(),
  path: z.string(),
  isPrimary: z.boolean(),
  sort: z.number()
})

const WorkspaceReadSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string(),
  color: z.string(),
  pinned: z.boolean(),
  archived: z.boolean(),
  sort: z.number(),
  folders: z.array(FolderSchema),
  /** primary 文件夹绝对路径；无文件夹时为 null */
  primaryPath: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
})

const WorkspaceWriteSchema = z.object({
  title: z.string().min(1).max(200),
  icon: z.string().min(1).max(40).optional(),
  color: z.string().min(1).max(32).optional(),
  folders: z
    .array(
      z.object({
        path: z.string().min(1).max(4096),
        isPrimary: z.boolean().optional()
      })
    )
    .min(1)
    .max(32)
})

const WorkspaceUpdateSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(200).optional(),
  icon: z.string().min(1).max(40).optional(),
  color: z.string().min(1).max(32).optional(),
  pinned: z.boolean().optional(),
  sort: z.number().int().optional(),
  /** 归档 / 取消归档（`workspace:archive` 只能单向归档） */
  archived: z.boolean().optional(),
  folders: z
    .array(
      z.object({
        /** 已有文件夹带 id；新增只带 path */
        id: z.uuid().optional(),
        path: z.string().min(1).max(4096),
        isPrimary: z.boolean().optional()
      })
    )
    .min(1)
    .max(32)
    .optional()
})

const WorkspaceIDSchema = z.object({
  id: z.uuid()
})

const FolderWriteSchema = z.object({
  workspaceID: z.uuid(),
  path: z.string().min(1).max(4096),
  isPrimary: z.boolean().optional()
})

const FolderUpdateSchema = z.object({
  id: z.uuid(),
  isPrimary: z.boolean().optional(),
  sort: z.number().int().optional()
})

const FolderRemoveSchema = z.object({
  id: z.uuid()
})

const ListDirSchema = z.object({
  workspaceID: z.uuid(),
  /** 相对 primary 根的路径；空/省略 = 根目录 */
  relative: z.string().max(2048).optional()
})

const DirEntrySchema = z.object({
  name: z.string(),
  kind: z.enum(['file', 'dir']),
  relative: z.string()
})

const SearchSchema = z.object({
  workspaceID: z.uuid(),
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(200).optional()
})

const SearchHitSchema = z.object({
  name: z.string(),
  relative: z.string()
})

const ListSkillsSchema = z.object({
  workspaceID: z.uuid()
})

const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  path: z.string(),
  relative: z.string()
})

const ReadFileSchema = z.object({
  workspaceID: z.uuid(),
  relative: z.string().min(1).max(2048)
})

const FileContentSchema = z.object({
  path: z.string(),
  relative: z.string(),
  content: z.string()
})

const GitProbeSchema = z.object({
  workspaceID: z.uuid()
})

const GitProbeResultSchema = z.object({
  isRepo: z.boolean(),
  branch: z.string().nullable()
})

const GitBranchesResultSchema = z.object({
  current: z.string(),
  branches: z.array(z.string())
})

const GitCheckoutSchema = z.object({
  workspaceID: z.uuid(),
  branch: z.string().min(1).max(200)
})

const GitCheckoutResultSchema = z.object({
  branch: z.string()
})

const ChangeEntrySchema = z.object({
  id: z.string(),
  path: z.string(),
  created: z.boolean(),
  added: z.number(),
  removed: z.number(),
  undone: z.boolean()
})

const ChangesReadSchema = z.object({
  sessionID: z.uuid()
})

const ChangesReadResultSchema = z.object({
  entries: z.array(ChangeEntrySchema),
  added: z.number(),
  removed: z.number()
})

const ChangesPatchSchema = z.object({
  sessionID: z.uuid(),
  /** 条目的 `id`（工作区相对路径）。按需读取：全量 patch 不进变更清单（否则每次轮询都背一遍 diff） */
  changeID: z.string().min(1)
})

const ChangesPatchResultSchema = z.object({
  /** unified diff 原文；超出上限时尾部带截断提示行 */
  patch: z.string()
})

const ChangesUndoSchema = z.object({
  sessionID: z.uuid(),
  /** 省略则撤销该会话全部未撤销变更 */
  changeID: z.string().optional()
})

/** 已归档的工作区不出现在常规列表里；侧栏的「已归档」分区显式索取 */
const WorkspaceReadInputSchema = z
  .object({
    includeArchived: z.boolean().optional()
  })
  .optional()

export const workspaceSpecs = {
  [CHANNELS.WORKSPACE.READ]: { in: WorkspaceReadInputSchema, out: z.array(WorkspaceReadSchema) },
  [CHANNELS.WORKSPACE.WRITE]: { in: WorkspaceWriteSchema, out: WorkspaceReadSchema },
  [CHANNELS.WORKSPACE.UPDATE]: { in: WorkspaceUpdateSchema, out: WorkspaceReadSchema },
  [CHANNELS.WORKSPACE.REMOVE]: { in: WorkspaceIDSchema, out: z.void() },
  [CHANNELS.WORKSPACE.ARCHIVE]: { in: WorkspaceIDSchema, out: WorkspaceReadSchema },

  [CHANNELS.WORKSPACE.FOLDERS.WRITE]: { in: FolderWriteSchema, out: FolderSchema },
  [CHANNELS.WORKSPACE.FOLDERS.UPDATE]: { in: FolderUpdateSchema, out: FolderSchema },
  [CHANNELS.WORKSPACE.FOLDERS.REMOVE]: { in: FolderRemoveSchema, out: z.void() },

  [CHANNELS.WORKSPACE.LIST_DIR]: { in: ListDirSchema, out: z.array(DirEntrySchema) },
  [CHANNELS.WORKSPACE.SEARCH]: { in: SearchSchema, out: z.array(SearchHitSchema) },
  [CHANNELS.WORKSPACE.READ_FILE]: { in: ReadFileSchema, out: FileContentSchema },
  [CHANNELS.WORKSPACE.LIST_SKILLS]: { in: ListSkillsSchema, out: z.array(SkillSchema) },

  [CHANNELS.WORKSPACE.GIT.PROBE]: { in: GitProbeSchema, out: GitProbeResultSchema },
  [CHANNELS.WORKSPACE.GIT.BRANCHES]: { in: GitProbeSchema, out: GitBranchesResultSchema },
  [CHANNELS.WORKSPACE.GIT.CHECKOUT]: { in: GitCheckoutSchema, out: GitCheckoutResultSchema },

  [CHANNELS.WORKSPACE.CHANGES.READ]: { in: ChangesReadSchema, out: ChangesReadResultSchema },
  [CHANNELS.WORKSPACE.CHANGES.PATCH]: { in: ChangesPatchSchema, out: ChangesPatchResultSchema },
  [CHANNELS.WORKSPACE.CHANGES.UNDO]: { in: ChangesUndoSchema, out: ChangesReadResultSchema }
} as const satisfies Record<ChannelOfDomain<'workspace'>, ChannelSpec>

export {
  ChangeEntrySchema,
  DirEntrySchema,
  FileContentSchema,
  FolderSchema,
  SearchHitSchema,
  SkillSchema,
  WorkspaceReadSchema,
  WorkspaceWriteSchema
}

/** 变更清单里的一行（侧栏与消息流共用同一份形状） */
export type ChangeEntry = z.infer<typeof ChangeEntrySchema>
