import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@preload': fileURLToPath(new URL('./src/preload', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        format: 'cjs',
        entryFileNames: 'preload.js'
      }
    }
  }
})
