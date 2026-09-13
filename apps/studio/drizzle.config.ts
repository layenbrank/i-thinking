import { defineConfig } from 'drizzle-kit'

/**
 * Drizzle Kit 配置：只用于**开发时**生成迁移（`drizzle-kit generate`）。
 * 运行时不用它 —— 主进程直接 `new Database(库路径)` + `migrate()`，见 src/plugins/database.ts。
 * `dbCredentials` 仅供 drizzle-kit 的 push/studio 等本地工具使用，指向临时库。
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './drizzle/schema/index.ts',
  out: './drizzle/migrations',
  dbCredentials: {
    url: 'file:./drizzle/dev.db'
  }
})
