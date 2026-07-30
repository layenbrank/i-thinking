import { defineConfig } from 'bumpp'

/**
 * Client（Tauri）独立版本。
 * 约定：apps/<project>/bump.<project>.ts + 根脚本 pnpm bump:<project>
 * 用法：pnpm bump:client 1.2.0-beta.1
 */
export default defineConfig({
  tag: true,
  commit: true,
  push: true,
  files: ['package.json', 'src-tauri/tauri.conf.json', 'src-tauri/Cargo.toml'],
  progress({ event, updatedFiles }) {
    console.log(`${event} 🛠 ☛ ——> ${updatedFiles}`)
  }
})
