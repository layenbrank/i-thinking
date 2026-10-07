import { defineConfig } from 'vite'

// https://vitejs.dev/config
export default defineConfig({
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
