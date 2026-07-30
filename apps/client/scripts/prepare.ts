/**
 * 构建前将 corex-serve 从 CARGO_TARGET_DIR 复制到 src-tauri/binaries/，并按 Tauri sidecar 命名。
 * 复制真实二进制后重写 SHA256SUMS（CI client-release 只验锁、不生成）。
 *
 * 用法（在 apps/client 目录）：
 *   bun run scripts/prepare.ts
 *   bun run scripts/prepare.ts --strict   # release 构建：禁止占位 sidecar
 *
 * 环境变量：
 *   CARGO_TARGET_DIR  — Cargo 产物目录（从此处查找 release/corex-serve）
 */

import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = path.resolve(SCRIPT_DIR, '..')
const TAURI_DIR = path.join(CLIENT_DIR, 'src-tauri')
const OUT_DIR = path.join(TAURI_DIR, 'binaries')
const PLACEHOLDER_MARKER = path.join(OUT_DIR, '.corex-placeholder')
const SHA256SUMS_PATH = path.join(OUT_DIR, 'SHA256SUMS')
const EXT = process.platform === 'win32' ? '.exe' : ''
const TARGET_TRIPLE = execSync('rustc --print host-tuple', { encoding: 'utf8' }).trim()
const BINARY_NAME = `corex-serve${EXT}`
const DEST = path.join(OUT_DIR, `corex-serve-${TARGET_TRIPLE}${EXT}`)
const DEST_BASENAME = path.basename(DEST)
const PDFIUM_DEST = path.join(OUT_DIR, 'pdfium.dll')
const PDFIUM_BASENAME = 'pdfium.dll'
const LOG_PREFIX = '[prepare]'

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

/** 计算文件 SHA-256（小写 hex）。 */
function hashFileSha256(filePath: string): string {
  const digest = createHash('sha256')
  digest.update(fs.readFileSync(filePath))
  return digest.digest('hex')
}

/**
 * 写入 binaries/SHA256SUMS（`hash␠␠filename`，与 CI 正则一致）。
 * 仅应在真实 sidecar 复制成功后调用。
 */
function writeSidecarChecksums(): void {
  const lines: string[] = []
  if (!fs.existsSync(DEST)) {
    throw new Error(`missing sidecar for checksums: ${DEST}`)
  }
  lines.push(`${hashFileSha256(DEST)}  ${DEST_BASENAME}`)
  if (fs.existsSync(PDFIUM_DEST)) {
    lines.push(`${hashFileSha256(PDFIUM_DEST)}  ${PDFIUM_BASENAME}`)
  }
  fs.writeFileSync(SHA256SUMS_PATH, `${lines.join('\n')}\n`, 'utf8')
  console.log(`${LOG_PREFIX} wrote ${SHA256SUMS_PATH}`)
}

/** 占位 sidecar 时移除过期清单，避免把 cmd.exe 等哈希提交进库。 */
function clearSidecarChecksums(reason: string): void {
  if (!fs.existsSync(SHA256SUMS_PATH)) return
  fs.unlinkSync(SHA256SUMS_PATH)
  console.warn(`${LOG_PREFIX} removed ${SHA256SUMS_PATH} (${reason})`)
}

function writePlaceholder(fallback: string, reason: string): void {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.copyFileSync(fallback, DEST)
  fs.writeFileSync(PLACEHOLDER_MARKER, `${fallback}\n`, 'utf8')
  clearSidecarChecksums('placeholder sidecar')
  console.warn(`${LOG_PREFIX} corex-serve 未找到，已用占位二进制 ${fallback}`)
  console.warn(`${LOG_PREFIX} ${reason}`)
}

function copySidecar(src: string): void {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.copyFileSync(src, DEST)
  copyPdfiumDll(src)

  if (fs.existsSync(PLACEHOLDER_MARKER)) fs.unlinkSync(PLACEHOLDER_MARKER)

  writeSidecarChecksums()
  console.log(`${LOG_PREFIX} ${src} -> ${DEST}`)
}

function prepare(): void {
  const cargoTargetDir = process.env.CARGO_TARGET_DIR
  const src = findCorexServePath()
  const missingReason = !cargoTargetDir
    ? '未设置 CARGO_TARGET_DIR（若经 turbo 启动，需在 turbo.json globalPassThroughEnv 中声明）'
    : `在 CARGO_TARGET_DIR 下未找到 release/${BINARY_NAME}（当前: ${cargoTargetDir}）`

  if (!src || !fs.existsSync(src)) {
    if (IS_STRICT) {
      console.error(`${LOG_PREFIX} --strict: ${missingReason}`)
      printMissingHint()
      process.exit(1)
    }

    const fallback = findPlaceholderBinary()
    if (!fallback) {
      console.error(`${LOG_PREFIX} ${missingReason}`)
      printMissingHint()
      process.exit(1)
    }

    writePlaceholder(fallback, missingReason)
    return
  }

  copySidecar(src)
}

prepare()

export {
  prepare,
  findCorexServePath,
  findPlaceholderBinary,
  copyPdfiumDll,
  writeSidecarChecksums,
  clearSidecarChecksums,
  hashFileSha256
}
