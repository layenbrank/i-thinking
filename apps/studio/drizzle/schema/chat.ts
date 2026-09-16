import { index, integer, sqliteTable, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'

/**
 * Chat 域：chatProvider / chatSession / chatMessage（studio 主进程自有，非 Tauri 共享实体）。
 *
 * 与 assistant-ui 持久化契约对齐（见 docs/architecture.md / task_plan D6）：
 * - `format` 是 MessageFormatAdapter 的格式标识，`content` 是它 `encode()` 的产物（不透明字符串）。
 *   两者构成消息的唯一真源；推理过程、工具调用、附件都在 `content` 的载荷里，
 *   因此**不再单列 `thinking` / `parts`**（旧 ai 域那样存会造成双轨）。
 * - `parentID` 是分支指针（assistant-ui 历史适配器的 `parent_id`）：编辑/重生成产生兄弟分支。
 *
 * 时间戳统一 `timestamp_ms`（Date ↔ INTEGER 毫秒），与同为主进程自有的 Auth 表一致。
 */

/** apiKey 不落库（存 plugin-store / safeStorage），渲染进程只拿元数据 */
export const chatProvider = sqliteTable(
  'chatProvider',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    baseUrl: text('baseUrl'),
    /** JSON 数组文本：可选模型清单 */
    models: text('models'),
    /** 该 provider 的默认模型 */
    model: text('model'),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull()
  },
  function (table) {
    return [index('idx_chatProvider_kind').on(table.kind)]
  }
)

export const chatSession = sqliteTable(
  'chatSession',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    /** 会话默认 provider；provider 被删则置空（会话保留） */
    providerID: text('providerID').references(
      function () {
        return chatProvider.id
      },
      { onDelete: 'set null' }
    ),
    /**
     * 归属的工作区：左栏按它归拢会话（对齐 Qoder 的「一个项目一撮任务」）。
     *
     * **刻意不加外键**：SQLite 的 `ALTER TABLE ADD COLUMN` 带不出 `ON DELETE`，
     * 而没有 `SET NULL` 的外键会把「删工作区」变成报错；
     * 重建表又会在事务里隐式 `DELETE FROM`，把会话的消息 CASCADE 掉。
     * 这里只需要一个分组指针 —— 工作区没了就是「未关联工作区」，由 `thread-groups` 兜底。
     */
    workspaceID: text('workspaceID'),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull()
  },
  function (table) {
    return [
      index('idx_chatSession_updatedAt').on(table.updatedAt),
      index('idx_chatSession_providerID').on(table.providerID),
      index('idx_chatSession_workspaceID').on(table.workspaceID)
    ]
  }
)

export const chatMessage = sqliteTable(
  'chatMessage',
  {
    id: text('id').primaryKey(),
    sessionID: text('sessionID')
      .notNull()
      .references(
        function () {
          return chatSession.id
        },
        { onDelete: 'cascade' }
      ),
    /** 自引用：删除一条消息会连带删除其后续分支 */
    parentID: text('parentID').references(
      function (): AnySQLiteColumn {
        return chatMessage.id
      },
      {
        onDelete: 'cascade'
      }
    ),
    /** MessageFormatAdapter 标识，参与契约，不可改名 */
    format: text('format').notNull(),
    /** `fmt.encode()` 产物 */
    content: text('content').notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull()
  },
  function (table) {
    return [
      index('idx_chatMessage_sessionID').on(table.sessionID),
      index('idx_chatMessage_parentID').on(table.parentID),
      index('idx_chatMessage_createdAt').on(table.createdAt)
    ]
  }
)
