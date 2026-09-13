import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** overlay —— 浮层项，`kind` 区分 texture / tile（几何用 REAL，`z` 是毫秒/整数） */
export const overlay = sqliteTable(
  'overlay',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    x: real('x').notNull(),
    y: real('y').notNull(),
    w: real('w').notNull(),
    h: real('h').notNull(),
    z: integer('z').notNull(),
    src: text('src'),
    opacity: real('opacity'),
    tenantID: text('tenantID'),
    component: text('component'),
    size: integer('size'),
    shape: text('shape'),
    direction: text('direction'),
    round: text('round'),
    background: text('background'),
    title: text('title').notNull().default(''),
    mark: text('mark'),
    scale: real('scale').notNull().default(1),
    archivedAt: integer('archivedAt'),
    createdAt: integer('createdAt').notNull(),
    updatedAt: integer('updatedAt').notNull()
  },
  function (table) {
    return [
      index('idx_overlay_archivedAt').on(table.archivedAt),
      index('idx_overlay_tenantID').on(table.tenantID)
    ]
  }
)
