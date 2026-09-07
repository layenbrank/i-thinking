import { existsSync, readFileSync } from 'node:fs'

import { logger } from '../../../core/logger.ts'
import { writeUtf8NoBom } from '../infra/fs.ts'

function readText(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

function detectNewline(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n'
}

function insertAfterExact(
  filePath: string,
  exactLine: string,
  newLine: string,
  alreadyContains: string
): boolean {
  if (!existsSync(filePath)) {
    logger.warn(`[wire] SKIP missing ${filePath}`)
    return false
  }
  const text = readText(filePath)
  if (alreadyContains && text.includes(alreadyContains)) {
    logger.info(`[wire] OK already: ${filePath} (${alreadyContains})`)
    return true
  }
  const nl = detectNewline(text)
  const lines = text.split(/\r?\n/)
  const idx = lines.findIndex(function (line) {
    return line === exactLine
  })
  if (idx < 0) {
    logger.warn(`[wire] WARN exact line not found in ${filePath}: ${exactLine}`)
    return false
  }
  const out = [...lines.slice(0, idx + 1), newLine, ...lines.slice(idx + 1)].join(nl)
  writeUtf8NoBom(filePath, out)
  logger.success(`[wire] PATCHED insert: ${filePath}`)
  return true
}

function replaceOnce(filePath: string, oldText: string, newText: string): boolean {
  if (!existsSync(filePath)) {
    logger.warn(`[wire] SKIP missing ${filePath}`)
    return false
  }
  const text = readText(filePath)
  if (text.includes(newText) && !text.includes(oldText)) {
    logger.info(`[wire] OK already replaced: ${filePath}`)
    return true
  }
  if (!text.includes(oldText)) {
    logger.warn(`[wire] WARN old text not found: ${filePath}`)
    return false
  }
  const count = text.split(oldText).length - 1
  if (count !== 1) {
    logger.warn(`[wire] WARN expected 1 occurrence in ${filePath}, found ${count}`)
    return false
  }
  writeUtf8NoBom(filePath, text.replace(oldText, newText))
  logger.success(`[wire] PATCHED replace: ${filePath}`)
  return true
}

function insertBeforeMarker(
  filePath: string,
  marker: string,
  block: string,
  alreadyContains: string
): boolean {
  if (!existsSync(filePath)) {
    logger.warn(`[wire] SKIP missing ${filePath}`)
    return false
  }
  const text = readText(filePath)
  if (text.includes(alreadyContains)) {
    logger.info(`[wire] OK already: ${filePath} (${alreadyContains})`)
    return true
  }
  if (!text.includes(marker)) {
    logger.warn(`[wire] WARN marker not found in ${filePath}`)
    return false
  }
  writeUtf8NoBom(filePath, text.replace(marker, block + marker))
  logger.success(`[wire] PATCHED before marker: ${filePath}`)
  return true
}

export { detectNewline, insertAfterExact, insertBeforeMarker, readText, replaceOnce }
