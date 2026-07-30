import { defineConfig } from 'bumpp'

/**
 * Docs（VitePress）独立版本。
 * 用法：pnpm bump:docs 1.2.0
 */
export default defineConfig({
  tag: false,
  commit: false,
  push: false,
  files: ['package.json'],
  progress({ event, updatedFiles }) {
    console.log(`${event} 🛠 ☛ ——> ${updatedFiles}`)
  }
})
