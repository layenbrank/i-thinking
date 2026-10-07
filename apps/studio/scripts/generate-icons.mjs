/**
 * 从 resources/icon.svg（现有品牌图）生成 1024 PNG 与 256 ICO。
 * macOS 的 icns 仅在有 iconutil 时生成，缺文件则 packager 跳过。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RESOURCES = path.join(ROOT, 'resources')
const PUBLIC = path.join(ROOT, 'public')
const SVG = path.join(RESOURCES, 'icon.svg')

function wrapPngAsIco(pngBuf) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)
  const entry = Buffer.alloc(16)
  // ICO 宽高字节 0 表示 256
  entry[0] = 0
  entry[1] = 0
  entry[2] = 0
  entry[3] = 0
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(pngBuf.length, 8)
  entry.writeUInt32LE(22, 12)
  return Buffer.concat([header, entry, pngBuf])
}

async function main() {
  if (!existsSync(SVG)) {
    throw new Error(`missing ${SVG}`)
  }
  mkdirSync(RESOURCES, { recursive: true })
  mkdirSync(PUBLIC, { recursive: true })
  const png = await sharp(readFileSync(SVG)).resize(1024, 1024).png().toBuffer()
  const icoPng = await sharp(png).resize(256, 256).png().toBuffer()
  const ico = wrapPngAsIco(icoPng)
  writeFileSync(path.join(RESOURCES, 'icon.png'), png)
  writeFileSync(path.join(RESOURCES, 'icon.ico'), ico)
  writeFileSync(path.join(PUBLIC, 'icon.png'), png)
  writeFileSync(path.join(PUBLIC, 'icon.ico'), ico)

  if (process.platform === 'darwin') {
    const iconset = path.join(RESOURCES, 'icons.iconset')
    mkdirSync(iconset, { recursive: true })
    const sizes = [16, 32, 64, 128, 256, 512, 1024]
    for (const size of sizes) {
      const buf = await sharp(png).resize(size, size).png().toBuffer()
      writeFileSync(path.join(iconset, `icon_${size}x${size}.png`), buf)
      if (size <= 512) {
        writeFileSync(path.join(iconset, `icon_${size}x${size}@2x.png`), buf)
      }
    }
    execFileSync('iconutil', ['-c', 'icns', iconset, '-o', path.join(RESOURCES, 'icon.icns')])
    rmSync(iconset, { recursive: true, force: true })
  }
}

await main()
