import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * mirror / magneticTile —— 定义对齐 apps/client/src-tauri/crates/database/src/entity/，
 * DDL 对齐 migrations_v001.rs（表名、列名、默认值、外键、索引）。
 * 时间戳列是毫秒整数，用 `integer`（ms < 2^53，直接给 number，避免 BigInt 无法 JSON 序列化）。
 */

export const mirror = sqliteTable('mirror', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  index: integer('index').notNull(),
  mark: text('mark').notNull().default(''),
  description: text('description').notNull().default('暂无描述'),
  overlay: text('overlay').notNull().default(''),
  /** 背景配置 JSON 字符串（边界层解析，与 Rust 的 serde `toSerialize` 一致） */
  background: text('background'),
  backdrop: text('backdrop'),
  archivedAt: integer('archivedAt'),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt').notNull()
})

export const magneticTile = sqliteTable(
  'magneticTile',
  {
    id: text('id').primaryKey(),
    index: integer('index').notNull(),
    title: text('title').notNull(),
    url: text('url'),
    round: text('round'),
    mark: text('mark'),
    /** 组件名（Tauri 侧是 String，此处 enum 仅约束 TS 类型，库中仍是 TEXT） */
    component: text('component').notNull(),
    description: text('description'),
    size: integer('size').notNull().default(3),
    shape: text('shape', { enum: ['square', 'circle', 'rectangle'] })
      .notNull()
      .default('rectangle'),
    direction: text('direction', { enum: ['vertical', 'horizontal'] })
      .notNull()
      .default('horizontal'),
    background: text('background'),
    backdrop: text('backdrop'),
    /**
     * 注意：**故意不建外键**。Tauri 版（migrations_v001.rs）只建了索引，没有 FK；
     * 加 FK 会改变"删除镜像"的语义（RESTRICT），与新老两版行为不一致。
     */
    mirrorID: text('mirrorID').notNull(),
    textColor: text('textColor'),
    collectionID: text('collectionID'),
    downloadCount: integer('downloadCount').notNull().default(0),
    archivedAt: integer('archivedAt'),
    updatedAt: integer('updatedAt').notNull(),
    createdAt: integer('createdAt').notNull()
  },
  function (table) {
    return [index('idx_magnetic_tile_mirror').on(table.mirrorID)]
  }
)
