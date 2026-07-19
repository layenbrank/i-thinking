import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('preload expose surface', function () {
  it('does not expose ipcRenderer to main world', function () {
    const source = readFileSync(path.join(__dirname, 'preload.ts'), 'utf8')
    expect(source).toContain("exposeInMainWorld('studio'")
    expect(source).not.toContain("exposeInMainWorld('ipcRenderer'")
  })
})
