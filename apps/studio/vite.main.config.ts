import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      // 仅不打包 better-sqlite3（含原生 .node）；适配器打进主进程，避免打包后 node_modules 解析失败
      external: ['better-sqlite3']
    }
  }
})
