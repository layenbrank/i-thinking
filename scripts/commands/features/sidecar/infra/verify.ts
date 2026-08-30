import { existsSync } from 'node:fs'
import path from 'node:path'

import { CHECKSUMS_FILE } from './constants.ts'
import { hashFile } from './hash.ts'
import { parseStagingChecksums } from './stage.ts'

function verifyStagedDir(stagedDir: string, label: string): void {
  const expected = parseStagingChecksums(stagedDir)

  for (const [fileName, digest] of Object.entries(expected.files)) {
    const filePath = path.join(stagedDir, fileName)
    if (!existsSync(filePath)) {
      throw new Error(`[verify] 缺少落盘文件: ${filePath}`)
    }
    const actual = hashFile(filePath)
    if (actual !== digest) {
      throw new Error(`[verify] 哈希不匹配 ${fileName}: 期望 ${digest}，实际 ${actual}`)
    }
  }

  console.log(
    `[verify:${label}] 通过（${Object.keys(expected.files).length} 个文件，${CHECKSUMS_FILE}）`
  )
}

export { verifyStagedDir }
