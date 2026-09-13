import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * studio 自有账户仓储（示例域，见 src/plugins/database.ts 的 USER 通道）。
 * 不属于 Tauri 版的实体集，故不受"两版同 schema"约束；
 * 时间戳用 `timestamp_ms`（Date ↔ INTEGER 毫秒），与旧 Prisma 的 DATETIME 列在 SQLite 下语义等价。
 */
export const auth = sqliteTable('Auth', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull()
})
