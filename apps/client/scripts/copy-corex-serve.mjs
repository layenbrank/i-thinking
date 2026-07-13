/**
 * 构建前将 corex-serve 复制到 src-tauri/binaries/ 并按 Tauri sidecar 命名。
 *
 * 用法（在 apps/client 目录）：
 *   node scripts/copy-corex-serve.mjs [corex-serve 路径]
 *   node scripts/copy-corex-serve.mjs --strict   # release 构建：禁止占位 sidecar
 *
 * 环境变量：
 *   COREX_SERVE  — 直接指定 corex-serve 可执行文件路径
 *   COREX_ROOT   — corex 仓库根目录（默认 D:/Documents/Rust/corex/master）
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const clientDir = path.resolve(__dirname, '..')
const tauriDir = path.join(clientDir, 'src-tauri')
const outDir = path.join(tauriDir, 'binaries')
const placeholderMarker = path.join(outDir, '.corex-placeholder')
const ext = process.platform === 'win32' ? '.exe' : ''
const targetTriple = execSync('rustc --print host-tuple', { encoding: 'utf8' }).trim()
const binaryName = `corex-serve${ext}`
const dest = path.join(outDir, `corex-serve-${targetTriple}${ext}`)
const pdfiumDest = path.join(outDir, 'pdfium.dll')

const args = process.argv.slice(2)
const isStrict = args.includes('--strict')
const cliPath = args.find((arg) => !arg.startsWith('--'))

function resolveCorexServePath() {
  const corexRoot = process.env.COREX_ROOT ?? 'D:/Documents/Rust/corex/master'
  const candidates = [
    cliPath,
    process.env.COREX_SERVE,
    path.join(corexRoot, 'target', targetTriple, 'release', binaryName),
    path.join(corexRoot, 'target', 'release', binaryName)
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }

  return candidates[0] ?? path.join(corexRoot, 'target', 'release', binaryName)
}

function findPlaceholderBinary() {
  if (process.platform === 'win32') {
    const fallback = process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe'
    return fs.existsSync(fallback) ? fallback : null
  }

  for (const candidate of ['/bin/true', '/usr/bin/true', '/bin/sh']) {
    if (fs.existsSync(candidate)) return candidate
  }

  return null
}

function copyPdfiumDll(serveSrc) {
  const pdfiumSrc = path.join(path.dirname(serveSrc), 'pdfium.dll')
  if (!fs.existsSync(pdfiumSrc)) {
    console.warn(`[copy-corex-serve] pdfium.dll 未找到: ${pdfiumSrc}`)
    return
  }

  fs.copyFileSync(pdfiumSrc, pdfiumDest)
  console.log(`[copy-corex-serve] ${pdfiumSrc} -> ${pdfiumDest}`)
}

const src = resolveCorexServePath()

if (!fs.existsSync(src)) {
  if (isStrict) {
    console.error(`[copy-corex-serve] --strict: 源文件不存在: ${src}`)
    console.error('请先执行: cd <COREX_ROOT> && cargo build -p corex-serve --release')
    console.error('然后设置 COREX_ROOT 或 COREX_SERVE 后重新打包')
    process.exit(1)
  }

  const fallback = findPlaceholderBinary()

  if (!fallback) {
    console.error(`[copy-corex-serve] 源文件不存在: ${src}`)
    console.error('请先执行: cd <COREX_ROOT> && cargo build -p corex-serve --release')
    process.exit(1)
  }

  fs.mkdirSync(outDir, { recursive: true })
  fs.copyFileSync(fallback, dest)
  fs.writeFileSync(placeholderMarker, `${fallback}\n`, 'utf8')

  console.warn(`[copy-corex-serve] corex-serve 未找到，已用占位二进制 ${fallback}`)
  console.warn('[copy-corex-serve] 请设置 COREX_SERVE 或构建 corex-serve 后重新运行')
  process.exit(0)
}

fs.mkdirSync(outDir, { recursive: true })
fs.copyFileSync(src, dest)
copyPdfiumDll(src)

if (fs.existsSync(placeholderMarker)) fs.unlinkSync(placeholderMarker)

console.log(`[copy-corex-serve] ${src} -> ${dest}`)
