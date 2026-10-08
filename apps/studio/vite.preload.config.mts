import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      // preload 只允许 `@/shared/**`（见 eslint 的 preload-process-boundaries）
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    minify: true,
    rollupOptions: {
      output: {
        format: 'cjs',
        entryFileNames: 'preload.js'
      }
    }
  }
})
