import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * AI / Agent 域：aiWorkspace / aiWorkspaceFolder / aiSession / aiMessage / aiProvider。
 * 外键与 Rust DDL 一致：folder 级联删除、session 置空、message 级联删除；
 * Rust 未声明 `ON UPDATE`（即为 NO ACTION），此处同样省略。
 */

export const aiWorkspace = sqliteTable(
  'aiWorkspace',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    icon: text('icon').notNull().default('folder'),
    color: text('color').notNull().default('#166534'),
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    archivedAt: integer('archivedAt'),
    createdAt: integer('createdAt').notNull(),
    updatedAt: integer('updatedAt').notNull()
  },
  function (table) {
    return [index('idx_aiWorkspace_archivedAt').on(table.archivedAt)]
  }
)

export const aiWorkspaceFolder = sqliteTable(
  'aiWorkspaceFolder',
  {
    id: text('id').primaryKey(),
    workspaceID: text('workspaceID')
      .notNull()
      .references(() => aiWorkspace.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    isPrimary: integer('isPrimary', { mode: 'boolean' }).notNull().default(false),
    sort: integer('sort').notNull().default(0),
    createdAt: integer('createdAt').notNull(),
    updatedAt: integer('updatedAt').notNull()
  },
  function (table) {
    return [index('idx_aiWorkspaceFolder_workspaceID').on(table.workspaceID)]
  }
)

export const aiSession = sqliteTable(
  'aiSession',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    workspaceID: text('workspaceID').references(() => aiWorkspace.id, {
      onDelete: 'set null'
    }),
    createdAt: integer('createdAt').notNull(),
    updatedAt: integer('updatedAt').notNull()
  },
  function (table) {
    return [
      index('idx_aiSession_workspaceID').on(table.workspaceID),
      index('idx_aiSession_updatedAt').on(table.updatedAt)
    ]
  }
)

export const aiMessage = sqliteTable(
  'aiMessage',
  {
    id: text('id').primaryKey(),
    identity: text('identity').notNull(),
    fragment: text('fragment').notNull(),
    thinking: text('thinking'),
    parts: text('parts'),
    sessionID: text('sessionID')
      .notNull()
      .references(() => aiSession.id, { onDelete: 'cascade' }),
    createdAt: integer('createdAt').notNull(),
    updatedAt: integer('updatedAt').notNull()
  },
  function (table) {
    return [
      index('idx_aiMessage_sessionID').on(table.sessionID),
      index('idx_aiMessage_createdAt').on(table.createdAt)
    ]
  }
)

/** apiKey 不落库（存 plugin-store） */
export const aiProvider = sqliteTable(
  'aiProvider',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    baseUrl: text('baseUrl'),
    models: text('models'),
    model: text('model'),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('createdAt').notNull(),
    updatedAt: integer('updatedAt').notNull()
  },
  function (table) {
    return [index('idx_aiProvider_kind').on(table.kind)]
  }
)
