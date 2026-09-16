import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * 工作区（Qoder 式）：一个工作区可挂多个源文件夹，其一为「主要」。
 *
 * Agent 的读/写/检索/git 以 **primary folder.path** 为沙箱根；路径必须落在根内 ——
 * 约束在主进程执行。会话归属见 `chat.ts` 的 `chatSession.workspaceID`。
 */

export const workspace = sqliteTable(
  'workspace',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    /** 图标 key（见 features/agent/workspace/icons.ts） */
    icon: text('icon').notNull().default('folder'),
    /** 副色（hex） */
    color: text('color').notNull().default('#166534'),
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    archivedAt: integer('archivedAt', { mode: 'timestamp_ms' }),
    sort: integer('sort').notNull().default(0),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull()
  },
  function (table) {
    return [
      index('idx_workspace_sort').on(table.sort),
      index('idx_workspace_archivedAt').on(table.archivedAt)
    ]
  }
)

export const workspaceFolder = sqliteTable(
  'workspaceFolder',
  {
    id: text('id').primaryKey(),
    workspaceID: text('workspaceID')
      .notNull()
      .references(function () {
        return workspace.id
      }, { onDelete: 'cascade' }),
    /** 绝对路径；全局唯一（同一目录不能挂进两个工作区） */
    path: text('path').notNull().unique(),
    isPrimary: integer('isPrimary', { mode: 'boolean' }).notNull().default(false),
    sort: integer('sort').notNull().default(0),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull()
  },
  function (table) {
    return [
      index('idx_workspaceFolder_workspaceID').on(table.workspaceID),
      index('idx_workspaceFolder_sort').on(table.sort)
    ]
  }
)
