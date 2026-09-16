import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { IpcError } from '../../shared/ipc/error'
import { listEntries, readTextFile, resolveInside, searchEntries } from './workspace-path'

/**
 * 工作区路径约束的单测。
 *
 * 这一层是 Agent 的沙箱边界：渲染进程只能给「根 + 相对路径」，越界必须在这里被挡住，
 * 所以它必须能脱离 DB / Electron 单独验证（`workspace.ts` 只负责查根与写库）。
 */

let root = ''
let outside = ''

beforeEach(function () {
  root = mkdtempSync(path.join(tmpdir(), 'ws-root-'))
  outside = mkdtempSync(path.join(tmpdir(), 'ws-outside-'))
})

afterEach(function () {
  rmSync(root, { recursive: true, force: true })
  rmSync(outside, { recursive: true, force: true })
})

/** 捕获抛出的 IpcError（vitest 的 `toThrowError` 只接受字符串/正则/错误类，不收谓词） */
function catchIpcError(run: () => unknown): IpcError {
  try {
    run()
  } catch (error) {
    if (error instanceof IpcError) return error
    throw error
  }
  throw new Error('expected the call to throw')
}

describe('resolveInside', function () {
  it('resolves a nested relative path inside the root', function () {
    mkdirSync(path.join(root, 'src', 'features'), { recursive: true })

    const actual = resolveInside(root, 'src/features')

    expect(actual).toBe(path.join(root, 'src', 'features'))
  })

  it('rejects absolute paths', function () {
    const error = catchIpcError(function () {
      resolveInside(root, path.join(outside, 'secret.txt'))
    })

    expect(error.code).toBe('WORKSPACE_PATH_ESCAPE')
  })

  it('rejects parent-directory escapes', function () {
    const error = catchIpcError(function () {
      resolveInside(root, '../outside/secret.txt')
    })

    expect(error.code).toBe('WORKSPACE_PATH_ESCAPE')
  })

  it('rejects a symlink that points outside the root', function () {
    // Windows 上创建符号链接需要权限；拿不到就跳过（junction 通常可用）
    try {
      symlinkSync(outside, path.join(root, 'link'), 'junction')
    } catch (error) {
      console.warn('[test] 当前环境无法建符号链接，跳过该用例', error)
      return
    }

    const error = catchIpcError(function () {
      resolveInside(root, 'link')
    })

    expect(error.code).toBe('WORKSPACE_PATH_ESCAPE')
  })
})

describe('listEntries', function () {
  beforeEach(function () {
    mkdirSync(path.join(root, 'src'))
    mkdirSync(path.join(root, 'node_modules'))
    writeFileSync(path.join(root, 'readme.md'), '# hi')
    writeFileSync(path.join(root, '.env.example'), 'A=1')
    writeFileSync(path.join(root, '.secret'), 'nope')
    writeFileSync(path.join(root, 'src', 'index.ts'), 'export {}')
  })

  it('lists directories first and skips hidden / ignored entries', function () {
    const actual = listEntries(root)

    expect(
      actual.map(function (entry) {
        return entry.name
      })
    ).toEqual(['src', '.env.example', 'readme.md'])
  })

  it('marks kind and returns root-relative posix paths', function () {
    const actual = listEntries(root)

    expect(actual[0]).toEqual({ name: 'src', kind: 'dir', relative: 'src' })
    expect(
      actual.find(function (entry) {
        return entry.name === 'readme.md'
      })
    ).toEqual({ name: 'readme.md', kind: 'file', relative: 'readme.md' })
  })

  it('lists a nested directory by relative path', function () {
    const actual = listEntries(root, 'src')

    expect(actual).toEqual([{ name: 'index.ts', kind: 'file', relative: 'src/index.ts' }])
  })

  it('refuses to escape', function () {
    const error = catchIpcError(function () {
      listEntries(root, '../')
    })

    expect(error.code).toBe('WORKSPACE_PATH_ESCAPE')
  })
})

describe('searchEntries', function () {
  beforeEach(function () {
    mkdirSync(path.join(root, 'src', 'chat'), { recursive: true })
    mkdirSync(path.join(root, 'node_modules'))
    writeFileSync(path.join(root, 'src', 'chat', 'chat-model.ts'), 'x')
    writeFileSync(path.join(root, 'src', 'chat', 'ChatPanel.tsx'), 'x')
    writeFileSync(path.join(root, 'src', 'other.ts'), 'x')
    writeFileSync(path.join(root, 'node_modules', 'chat-dep.ts'), 'x')
  })

  it('matches file names case-insensitively and skips ignored dirs', function () {
    const actual = searchEntries(root, 'chat')

    expect(
      actual.map(function (entry) {
        return entry.relative
      })
    ).toEqual(['src/chat/chat-model.ts', 'src/chat/ChatPanel.tsx'])
  })

  it('honours the limit', function () {
    const actual = searchEntries(root, '.ts', 1)

    expect(actual).toHaveLength(1)
  })

  it('returns nothing for a blank query', function () {
    expect(searchEntries(root, '   ')).toEqual([])
  })
})

describe('readTextFile', function () {
  it('reads a file inside the root', function () {
    writeFileSync(path.join(root, 'note.md'), 'hello')

    expect(readTextFile(root, 'note.md')).toBe('hello')
  })

  it('rejects files beyond the size cap', function () {
    writeFileSync(path.join(root, 'huge.txt'), 'a'.repeat(2 * 1024 * 1024 + 1))

    const error = catchIpcError(function () {
      readTextFile(root, 'huge.txt')
    })

    expect(error.code).toBe('WORKSPACE_FILE_TOO_LARGE')
  })

  it('rejects directories', function () {
    mkdirSync(path.join(root, 'src'))

    const error = catchIpcError(function () {
      readTextFile(root, 'src')
    })

    expect(error.code).toBe('WORKSPACE_ENTRY_NOT_FOUND')
  })
})
