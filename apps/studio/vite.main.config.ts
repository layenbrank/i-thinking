import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// https://vitejs.dev/config
// Forge plugin-vite 默认 main 为 CJS；与 package.json "type":"commonjs" 一致。
export default defineConfig({
  resolve: {
    alias: {
      '@main': fileURLToPath(new URL('./src/main', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@generated': fileURLToPath(new URL('./generated', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      external: ['better-sqlite3', 'electron-updater'],
      output: {
        entryFileNames: 'main.js'
      }
    }
  }
})
