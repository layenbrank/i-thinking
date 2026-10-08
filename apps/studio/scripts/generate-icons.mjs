/**
 * 从 apps/client 的 Tauri 图标同步到 Studio（resources/ + public/）。
 *
 * 品牌图单一来源：`apps/client/src-tauri/icons/`（icon.ico / icon.png / icon.icns）。
 * Studio 不另维护 SVG；改图标只改 client，再跑本脚本。
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CLIENT_ICONS = path.resolve(ROOT, '..', 'client', 'src-tauri', 'icons')
const RESOURCES = path.join(ROOT, 'resources')
const PUBLIC = path.join(ROOT, 'public')

const FILES = ['icon.ico', 'icon.png', 'icon.icns']

function main() {
  if (!existsSync(CLIENT_ICONS)) {
    throw new Error(`missing client icons dir: ${CLIENT_ICONS}`)
  }

  mkdirSync(RESOURCES, { recursive: true })
  mkdirSync(PUBLIC, { recursive: true })

  for (const file of FILES) {
    const source = path.join(CLIENT_ICONS, file)
    if (!existsSync(source)) {
      if (file === 'icon.icns') {
        console.warn(`[icons] skip missing ${file}（非 macOS 打包可无）`)
        continue
      }
      throw new Error(`missing ${source}`)
    }
    copyFileSync(source, path.join(RESOURCES, file))
    // 开发态托盘 / 窗口也可从 public 取；icns 仅打包用，不必进 public
    if (file !== 'icon.icns') {
      copyFileSync(source, path.join(PUBLIC, file))
    }
    console.log(`[icons] ${file} ← client`)
  }
}

main()
