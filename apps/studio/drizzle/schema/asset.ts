import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** asset —— 资产文件（含 `version`，对齐 Rust DDL） */
export const asset = sqliteTable(
  'asset',
  {
    id: text('id').primaryKey(),
    tenantID: text('tenantID'),
    kind: text('kind'),
    hash: text('hash'),
    sha: text('sha').notNull().default('sha256'),
    size: integer('size'),
    index: integer('index').notNull().default(1),
    mime: text('mime').notNull(),
    extension: text('extension'),
    fileName: text('fileName').notNull(),
    filePath: text('filePath').notNull(),
    /** 元信息 JSON 字符串（Rust 侧是普通 String，不做 serde 转换） */
    metadata: text('metadata'),
    status: text('status').notNull().default('001'),
    version: integer('version').notNull().default(1),
    deviceID: text('deviceID'),
    archivedAt: integer('archivedAt'),
    createdAt: integer('createdAt').notNull(),
    updatedAt: integer('updatedAt').notNull()
  },
  function (table) {
    return [
      index('idx_asset_hash').on(table.hash),
      index('idx_asset_path').on(table.filePath)
    ]
  }
)
