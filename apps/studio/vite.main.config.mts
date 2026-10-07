import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

function findBuildFeedUrl(): string {
  const url = process.env.STUDIO_UPDATE_URL?.trim()
  if (url) return url.replace(/\/$/, '')
  const base = process.env.STUDIO_S3_UPDATE_BASE?.trim()
  if (!base) return ''
  return `${base.replace(/\/$/, '')}/win32/x64`
}

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
  define: {
    'process.env.STUDIO_UPDATE_FEED_URL': JSON.stringify(findBuildFeedUrl())
  },
  build: {
    minify: true,
    rollupOptions: {
      external: ['better-sqlite3'],
      output: {
        entryFileNames: 'main.js'
      }
    }
  }
})
