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
      // 不打包原生模块和 Prisma 适配器，由运行时 require 加载
      external: ['better-sqlite3', '@prisma/adapter-better-sqlite3']
    }
  }
})
