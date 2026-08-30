import { createHash } from 'node:crypto'
import { createReadStream, readFileSync } from 'node:fs'

function hashFile(filePath: string): string {
  const hash = createHash('sha256')
  hash.update(readFileSync(filePath))
  return hash.digest('hex')
}

async function hashFileStream(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  const stream = createReadStream(filePath)
  for await (const chunk of stream) {
    hash.update(chunk as Buffer)
  }
  return hash.digest('hex')
}

function assertSha256(actual: string, expected: string, label: string): void {
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`[hash] ${label} sha256 不匹配: 期望 ${expected}，实际 ${actual}`)
  }
}

export { assertSha256, hashFile, hashFileStream }
