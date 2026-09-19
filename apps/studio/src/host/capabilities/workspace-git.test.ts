import { describe, expect, it } from 'vitest'

import { parseCheckoutFailure } from '@/host/capabilities/workspace-git.ts'

describe('parseCheckoutFailure', function () {
  it('脏工作区不把 git 原文抛给界面', function () {
    const raw = `Command failed: git checkout feat/browser
error: Your local changes to the following files would be overwritten by checkout:
Please commit your changes or stash them before you switch branches.`

    expect(parseCheckoutFailure(raw, 'feat/browser')).toBe(
      '工作区还有未提交的改动，切到 feat/browser 会盖掉这些文件。先提交或暂存后再切。'
    )
  })

  it('找不到分支时单独说明', function () {
    expect(parseCheckoutFailure("pathspec 'nope' did not match any file", 'nope')).toBe(
      '找不到分支 nope'
    )
  })
})
