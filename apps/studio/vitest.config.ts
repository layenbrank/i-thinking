import { fileURLToPath, URL } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

/**
 * 集成测试（`*.integration.test.ts`）需要 Electron ABI 的 better-sqlite3，
 * 普通 Node 跑不了，故用环境变量分流：
 *   - `test:unit`（默认）：只跑单测，排除集成测试
 *   - `test:db`：只跑集成测试（scripts/run-db-tests.mjs 会置标记并在 Electron 运行时里执行）
 */
const dbOnly = process.env.STUDIO_DB_TESTS === '1'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: dbOnly
      ? ['src/**/*.integration.test.ts']
      : ['src/**/*.test.ts'],
    exclude: [
      ...configDefaults.exclude,
      ...(dbOnly ? [] : ['src/**/*.integration.test.ts'])
    ]
  }
})
