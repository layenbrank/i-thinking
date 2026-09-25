import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  applyChain,
  applyUndo,
  readCurrentText,
  reverseApply,
  toChangeReport,
  toFileDiff,
  toRelativePath
} from './changes.ts'

const ROOT = path.resolve('D:/work/demo')

/** 真实 opencode 返回的形状：patch 是完整 unified diff，status 是 added/deleted/modified */
function diff(
  file: string,
  patch: string,
  additions: number,
  deletions: number,
  status?: string
) {
  return status === undefined ? { file, patch, additions, deletions } : { file, patch, additions, deletions, status }
}

/** 逐字节照抄 probe11 抓到的 patch（含 `Index:` 头与孤立的分隔线） */
function replacePatch(file: string, before: string, after: string): string {
  return [
    `Index: ${file}`,
    '===================================================================',
    `--- ${file}\toriginal`,
    `+++ ${file}\tmodified`,
    '@@ -1,1 +1,1 @@',
    `-${before}`,
    `+${after}`,
    ''
  ].join('\n')
}

function appendPatch(file: string, line: string): string {
  return [
    `Index: ${file}`,
    '===================================================================',
    `--- ${file}\toriginal`,
    `+++ ${file}\tmodified`,
    '@@ -0,0 +1,1 @@',
    `+${line}`,
    ''
  ].join('\n')
}

function deletePatch(file: string, before: string): string {
  return [
    `Index: ${file}`,
    '===================================================================',
    `--- ${file}\toriginal`,
    `+++ ${file}\tmodified`,
    '@@ -1,1 +0,0 @@',
    `-${before}`,
    ''
  ].join('\n')
}

describe('toRelativePath', function () {
  it('keeps paths opencode already made relative', function () {
    expect(toRelativePath(ROOT, 'src/app.ts')).toBe('src/app.ts')
  })

  it('rebases absolute paths onto the workspace', function () {
    expect(toRelativePath(ROOT, path.join(ROOT, 'src', 'app.ts'))).toBe('src/app.ts')
  })

  it('normalizes separators to slashes for display', function () {
    expect(toRelativePath(ROOT, path.join(ROOT, 'pkg', 'a.ts'))).not.toContain('\\')
  })
})

describe('toFileDiff', function () {
  it('narrows the runtime shape', function () {
    expect(
      toFileDiff({
        file: 'a.ts',
        patch: 'p',
        additions: 1,
        deletions: 2,
        status: 'modified'
      })
    ).toEqual({ file: 'a.ts', patch: 'p', additions: 1, deletions: 2, status: 'modified' })
  })

  it('tolerates the stale SDK shape that has no patch', function () {
    expect(toFileDiff({ file: 'a.ts', before: 'x', after: 'y', additions: 1, deletions: 1 })).toEqual(
      { file: 'a.ts', patch: '', additions: 1, deletions: 1 }
    )
  })

  it('drops entries without a file name', function () {
    expect(toFileDiff({ patch: 'p' })).toBeNull()
    expect(toFileDiff(null)).toBeNull()
    expect(toFileDiff('a.ts')).toBeNull()
  })
})

describe('reverseApply', function () {
  it('swaps the new side back for the old side', function () {
    expect(reverseApply('C\n', replacePatch('notes.txt', 'B', 'C'))).toBe('B\n')
  })

  it('removes a line the agent appended', function () {
    expect(reverseApply('A\nhello\n', appendPatch('a.txt', 'hello'))).toBe('A\n')
  })

  it('recreates a deleted file', function () {
    expect(reverseApply('', deletePatch('gone.txt', 'A'))).toBe('A')
  })

  it('keeps CRLF intact because the carriage return is part of the line', function () {
    const patch = [
      'Index: notes.txt',
      '@@ -1,1 +1,1 @@',
      '-B\r',
      '+C\r',
      ''
    ].join('\n')

    expect(reverseApply('C\r\n', patch)).toBe('B\r\n')
  })

  it('refuses to guess when the content does not match', function () {
    expect(reverseApply('Z\n', replacePatch('notes.txt', 'B', 'C'))).toBeNull()
  })

  it('refuses a patch without hunks', function () {
    expect(reverseApply('C\n', `Index: notes.txt\n`)).toBeNull()
  })
})

describe('applyChain', function () {
  it('deletes a file the session created', function () {
    const patches = [diff('new.txt', appendPatch('new.txt', 'hello'), 1, 0, 'added')]

    expect(applyChain('hello\n', patches)).toEqual({ kind: 'delete' })
  })

  it('unwinds patches from newest to oldest', function () {
    const patches = [
      diff('notes.txt', replacePatch('notes.txt', 'A', 'B'), 1, 1, 'modified'),
      diff('notes.txt', replacePatch('notes.txt', 'B', 'C'), 1, 1, 'modified')
    ]

    expect(applyChain('C\n', patches)).toEqual({ kind: 'restore', content: 'A\n' })
  })

  it('reports a mismatch instead of writing a wrong version', function () {
    const patches = [diff('notes.txt', replacePatch('notes.txt', 'B', 'C'), 1, 1, 'modified')]

    expect(applyChain('ZZZ\n', patches)).toMatchObject({ kind: 'unsupported' })
  })

  it('has nothing to do without patches', function () {
    expect(applyChain('C\n', [])).toMatchObject({ kind: 'unsupported' })
  })
})

describe('readCurrentText', function () {
  it('returns the content of a file that exists', function () {
    const dir = mkdtempSync(path.join(tmpdir(), 'studio-changes-'))
    const file = path.join(dir, 'a.txt')
    writeFileSync(file, 'hello', 'utf8')

    expect(readCurrentText(file)).toBe('hello')
    rmSync(dir, { recursive: true, force: true })
  })

  it('returns null when the file is gone', function () {
    const dir = mkdtempSync(path.join(tmpdir(), 'studio-changes-'))

    expect(readCurrentText(path.join(dir, 'missing.txt'))).toBeNull()
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('toChangeReport', function () {
  it('maps opencode diffs onto the UI contract', function () {
    const report = toChangeReport(
      [diff(path.join(ROOT, 'a.ts'), replacePatch('a.ts', 'x', 'y'), 1, 0)],
      ROOT
    )

    expect(report).toEqual({
      entries: [{ id: 'a.ts', path: 'a.ts', created: false, added: 1, removed: 0, undone: false }],
      added: 1,
      removed: 0
    })
  })

  it('marks a file whose first patch was an addition as created', function () {
    const report = toChangeReport([diff('new.ts', appendPatch('new.ts', 'hi'), 1, 0, 'added')], ROOT)

    expect(report.entries[0]?.created).toBe(true)
  })

  it('groups repeated edits and counts only the latest patch', function () {
    const report = toChangeReport(
      [
        diff('a.ts', replacePatch('a.ts', 'A', 'B'), 4, 4),
        diff('a.ts', replacePatch('a.ts', 'B', 'C'), 2, 1)
      ],
      ROOT
    )

    expect(report.entries).toHaveLength(1)
    expect(report.entries[0]).toMatchObject({ added: 2, removed: 1 })
    expect(report.added).toBe(2)
    expect(report.removed).toBe(1)
  })

  it('sums additions and deletions across files', function () {
    const report = toChangeReport(
      [diff('a.ts', replacePatch('a.ts', 'a', 'b'), 2, 3), diff('b.ts', replacePatch('b.ts', 'a', 'b'), 5, 1)],
      ROOT
    )

    expect(report.added).toBe(7)
    expect(report.removed).toBe(4)
  })

  it('is empty when nothing changed', function () {
    expect(toChangeReport([], ROOT)).toEqual({ entries: [], added: 0, removed: 0 })
  })

  it('marks an entry undone when the file no longer matches the patch', function () {
    const report = toChangeReport(
      [diff('a.ts', replacePatch('a.ts', 'x', 'y'), 1, 0)],
      ROOT,
      function () {
        return 'x\n'
      }
    )

    expect(report.entries[0]?.undone).toBe(true)
    expect(report.added).toBe(0)
    expect(report.removed).toBe(0)
  })

  it('keeps an entry live while the file still matches', function () {
    const report = toChangeReport(
      [diff('a.ts', replacePatch('a.ts', 'x', 'y'), 1, 0)],
      ROOT,
      function () {
        return 'y\n'
      }
    )

    expect(report.entries[0]?.undone).toBe(false)
  })

  it('treats an unreadable file as still live instead of undone', function () {
    const report = toChangeReport(
      [diff('a.ts', replacePatch('a.ts', 'x', 'y'), 1, 0)],
      ROOT,
      function () {
        return undefined
      }
    )

    expect(report.entries[0]?.undone).toBe(false)
  })

  it('treats a missing file as undone unless the change was a deletion', function () {
    const missing = function () {
      return null
    }
    const modified = toChangeReport([diff('a.ts', replacePatch('a.ts', 'x', 'y'), 1, 0)], ROOT, missing)
    const deleted = toChangeReport(
      [diff('a.ts', deletePatch('a.ts', 'x'), 0, 1, 'deleted')],
      ROOT,
      missing
    )

    expect(modified.entries[0]?.undone).toBe(true)
    expect(deleted.entries[0]?.undone).toBe(false)
  })
})

describe('applyUndo', function () {
  it('writes the previous content back', function () {
    const dir = mkdtempSync(path.join(tmpdir(), 'studio-changes-'))
    const file = path.join(dir, 'a.ts')
    writeFileSync(file, 'changed', 'utf8')

    applyUndo(file, { kind: 'restore', content: 'original' })

    expect(readFileSync(file, 'utf8')).toBe('original')
    rmSync(dir, { recursive: true, force: true })
  })

  it('deletes a file that did not exist before', function () {
    const dir = mkdtempSync(path.join(tmpdir(), 'studio-changes-'))
    const file = path.join(dir, 'created.ts')
    writeFileSync(file, 'brand new', 'utf8')

    applyUndo(file, { kind: 'delete' })

    expect(function () {
      return readFileSync(file, 'utf8')
    }).toThrow()
    rmSync(dir, { recursive: true, force: true })
  })

  it('tolerates an already deleted file', function () {
    const dir = mkdtempSync(path.join(tmpdir(), 'studio-changes-'))
    const file = path.join(dir, 'gone.ts')

    expect(function () {
      applyUndo(file, { kind: 'delete' })
    }).not.toThrow()
    rmSync(dir, { recursive: true, force: true })
  })

  it('throws when the change cannot be reversed', function () {
    const dir = mkdtempSync(path.join(tmpdir(), 'studio-changes-'))
    const file = path.join(dir, 'a.ts')
    writeFileSync(file, 'changed', 'utf8')

    expect(function () {
      applyUndo(file, { kind: 'unsupported', reason: '对不上' })
    }).toThrow('对不上')
    expect(readFileSync(file, 'utf8')).toBe('changed')
    rmSync(dir, { recursive: true, force: true })
  })
})
