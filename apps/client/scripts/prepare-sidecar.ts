/**
 * 构建前将 corex-serve 从 CARGO_TARGET_DIR 复制到 src-tauri/binaries/，并按 Tauri sidecar 命名。
 *
 * 用法（在 apps/client 目录）：
 *   bun run scripts/prepare-sidecar.ts
 *   bun run scripts/prepare-sidecar.ts --strict   # release 构建：禁止占位 sidecar
 *
 * 环境变量：
 *   CARGO_TARGET_DIR  — Cargo 产物目录（从此处查找 release/corex-serve）
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = path.resolve(SCRIPT_DIR, '..')
const TAURI_DIR = path.join(CLIENT_DIR, 'src-tauri')
const OUT_DIR = path.join(TAURI_DIR, 'binaries')
const PLACEHOLDER_MARKER = path.join(OUT_DIR, '.corex-placeholder')
const EXT = process.platform === 'win32' ? '.exe' : ''
const TARGET_TRIPLE = execSync('rustc --print host-tuple', { encoding: 'utf8' }).trim()
const BINARY_NAME = `corex-serve${EXT}`
const DEST = path.join(OUT_DIR, `corex-serve-${TARGET_TRIPLE}${EXT}`)
const PDFIUM_DEST = path.join(OUT_DIR, 'pdfium.dll')
const LOG_PREFIX = '[prepare-sidecar]'

const IS_STRICT = process.argv.slice(2).includes('--strict')

/** 仅从 CARGO_TARGET_DIR 查找 corex-serve release 产物。 */
function findCorexServePath(): string | null {
  const cargoTargetDir = process.env.CARGO_TARGET_DIR
  if (!cargoTargetDir) return null

  const candidates = [
    path.join(cargoTargetDir, TARGET_TRIPLE, 'release', BINARY_NAME),
    path.join(cargoTargetDir, 'release', BINARY_NAME)
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }

  return candidates[1] ?? null
}

function findPlaceholderBinary(): string | null {
  if (process.platform === 'win32') {
    const fallback = process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe'
    return fs.existsSync(fallback) ? fallback : null
  }

  for (const candidate of ['/bin/true', '/usr/bin/true', '/bin/sh']) {
    if (fs.existsSync(candidate)) return candidate
  }

  return null
}

function copyPdfiumDll(serveSrc: string): void {
  const pdfiumSrc = path.join(path.dirname(serveSrc), 'pdfium.dll')
  if (!fs.existsSync(pdfiumSrc)) {
    console.warn(`${LOG_PREFIX} pdfium.dll 未找到: ${pdfiumSrc}`)
    return
  }

  fs.copyFileSync(pdfiumSrc, PDFIUM_DEST)
  console.log(`${LOG_PREFIX} ${pdfiumSrc} -> ${PDFIUM_DEST}`)
}

function printMissingHint(): void {
  console.error('请先执行: cargo build -p corex-serve --release')
  console.error('并设置 CARGO_TARGET_DIR（指向 target 目录）')
}

function writePlaceholder(fallback: string): void {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.copyFileSync(fallback, DEST)
  fs.writeFileSync(PLACEHOLDER_MARKER, `${fallback}\n`, 'utf8')
  console.warn(`${LOG_PREFIX} corex-serve 未找到，已用占位二进制 ${fallback}`)
  console.warn(`${LOG_PREFIX} 请设置 CARGO_TARGET_DIR 后重新运行`)
}

function copySidecar(src: string): void {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.copyFileSync(src, DEST)
  copyPdfiumDll(src)

  if (fs.existsSync(PLACEHOLDER_MARKER)) fs.unlinkSync(PLACEHOLDER_MARKER)

  console.log(`${LOG_PREFIX} ${src} -> ${DEST}`)
}

function prepareSidecar(): void {
  const src = findCorexServePath()

  if (!src || !fs.existsSync(src)) {
    if (IS_STRICT) {
      console.error(
        `${LOG_PREFIX} --strict: 源文件不存在${src ? `: ${src}` : '（未设置 CARGO_TARGET_DIR）'}`
      )
      printMissingHint()
      process.exit(1)
    }

    const fallback = findPlaceholderBinary()
    if (!fallback) {
      console.error(
        `${LOG_PREFIX} 源文件不存在${src ? `: ${src}` : '（未设置 CARGO_TARGET_DIR）'}`
      )
      printMissingHint()
      process.exit(1)
    }

    writePlaceholder(fallback)
    return
  }

  copySidecar(src)
}

prepareSidecar()

export { prepareSidecar, findCorexServePath, findPlaceholderBinary, copyPdfiumDll }
