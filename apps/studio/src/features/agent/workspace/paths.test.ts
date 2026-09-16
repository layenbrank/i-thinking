import { describe, expect, it } from 'vitest'

import { findWorkspaceRelative, resolveWorkspacePicks } from './paths'

/**
 * 这里挡的是「引用了一个 Agent 读不到的文件」：
 * 系统对话框可以选到工作区外，必须提前给出可解释的答案，而不是让模型去撞沙箱。
 */

const ROOT = 'D:\\work\\alpha'

describe('findWorkspaceRelative', function () {
  it('accepts a nested file and normalizes separators', function () {
    expect(findWorkspaceRelative('D:\\work\\alpha\\src\\main.ts', ROOT)).toBe('src/main.ts')
  })

  it('accepts forward slashes', function () {
    expect(findWorkspaceRelative('D:/work/alpha/src/main.ts', ROOT)).toBe('src/main.ts')
  })

  it('ignores a trailing separator', function () {
    expect(findWorkspaceRelative('D:/work/alpha/src/', ROOT)).toBe('src')
  })

  it('returns a dot for the root itself', function () {
    expect(findWorkspaceRelative('D:/work/alpha', ROOT)).toBe('.')
    expect(findWorkspaceRelative('D:/work/alpha/', ROOT)).toBe('.')
  })

  it('is case-insensitive about drive letters and folder names', function () {
    expect(findWorkspaceRelative('d:/WORK/Alpha/src/Main.ts', ROOT)).toBe('src/Main.ts')
  })

  it('rejects a sibling whose name shares the prefix', function () {
    expect(findWorkspaceRelative('D:/work/alphabeta/x.ts', ROOT)).toBeNull()
  })

  it('rejects a path above the root', function () {
    expect(findWorkspaceRelative('D:/work/other/x.ts', ROOT)).toBeNull()
    expect(findWorkspaceRelative('D:/work', ROOT)).toBeNull()
  })

  it('rejects empty inputs', function () {
    expect(findWorkspaceRelative('', ROOT)).toBeNull()
    expect(findWorkspaceRelative('D:/work/alpha/x.ts', '')).toBeNull()
  })
})

describe('resolveWorkspacePicks', function () {
  it('keeps inside paths and reports the rest by name', function () {
    const actual = resolveWorkspacePicks(
      ['D:/work/alpha/src/a.ts', 'D:/elsewhere/b.ts', 'D:/work/alpha'],
      ROOT
    )

    expect(actual.relatives).toEqual(['src/a.ts'])
    expect(actual.skipped).toEqual(['b.ts', 'alpha'])
  })

  it('dedupes repeated picks', function () {
    const actual = resolveWorkspacePicks(['D:/work/alpha/a.ts', 'D:\\work\\alpha\\a.ts'], ROOT)

    expect(actual.relatives).toEqual(['a.ts'])
    expect(actual.skipped).toEqual([])
  })

  it('returns nothing for no picks', function () {
    expect(resolveWorkspacePicks([], ROOT)).toEqual({ relatives: [], skipped: [] })
  })
})
