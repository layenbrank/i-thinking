import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// https://vitejs.dev/config
// 文件用 .mts 是为了让 Vite 以原生 ESM 加载配置（package.json 是 "type":"commonjs"，
// 不能用 .ts，否则 configLoader:'native' 会报不支持 ESM 语法）。
// 产物本身仍是 CJS：Forge plugin-vite 默认 main 为 CJS，与 package.json "type":"commonjs" 一致。
export default defineConfig({
  resolve: {
    alias: {
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
