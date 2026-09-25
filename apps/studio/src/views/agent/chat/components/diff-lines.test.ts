import { describe, expect, it } from 'vitest'

import { toDiffFiles, toDiffPreview } from '@/views/agent/chat/components/diff-lines.ts'

const SINGLE_FILE = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 1111111..2222222 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1,4 +1,5 @@',
  ' const a = 1',
  '-const b = 2',
  '+const b = 3',
  '+const c = 4',
  ' const d = 5'
].join('\n')

describe('toDiffFiles', function () {
  it('推导上下文/删除/新增行的旧新行号', function () {
    const files = toDiffFiles(SINGLE_FILE)

    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('src/a.ts')
    expect(files[0].added).toBe(2)
    expect(files[0].removed).toBe(1)
    expect(files[0].hunks[0].header).toBe('@@ -1,4 +1,5 @@')
    expect(files[0].hunks[0].lines).toEqual([
      { kind: 'context', oldLine: 1, newLine: 1, text: 'const a = 1' },
      { kind: 'remove', oldLine: 2, newLine: null, text: 'const b = 2' },
      { kind: 'add', oldLine: null, newLine: 2, text: 'const b = 3' },
      { kind: 'add', oldLine: null, newLine: 3, text: 'const c = 4' },
      { kind: 'context', oldLine: 3, newLine: 4, text: 'const d = 5' }
    ])
  })

  it('新建文件时路径取 `+++` 侧，`/dev/null` 不算路径', function () {
    const patch = [
      'diff --git a/note.md b/note.md',
      'new file mode 100644',
      'index 0000000..3333333',
      '--- /dev/null',
      '+++ b/note.md',
      '@@ -0,0 +1,2 @@',
      '+第一行',
      '+第二行'
    ].join('\n')

    const files = toDiffFiles(patch)
    expect(files[0].path).toBe('note.md')
    expect(files[0].hunks[0].lines[0]).toEqual({
      kind: 'add',
      oldLine: null,
      newLine: 1,
      text: '第一行'
    })
  })

  it('删除文件时路径回退到 `---` 侧', function () {
    const patch = [
      'diff --git a/old.txt b/old.txt',
      'deleted file mode 100644',
      '--- a/old.txt',
      '+++ /dev/null',
      '@@ -1 +0,0 @@',
      '-被删掉的内容'
    ].join('\n')

    const files = toDiffFiles(patch)
    expect(files[0].path).toBe('old.txt')
    expect(files[0].added).toBe(0)
    expect(files[0].removed).toBe(1)
  })

  it('按 `diff --git` 切分多文件', function () {
    const patch = [
      SINGLE_FILE,
      'diff --git a/src/b.ts b/src/b.ts',
      '--- a/src/b.ts',
      '+++ b/src/b.ts',
      '@@ -10,1 +10,1 @@',
      '-old',
      '+new'
    ].join('\n')

    const files = toDiffFiles(patch)
    expect(
      files.map(function (file) {
        return file.path
      })
    ).toEqual(['src/a.ts', 'src/b.ts'])
    expect(files[1].hunks[0].lines[0].oldLine).toBe(10)
    expect(files[1].hunks[0].lines[1].newLine).toBe(10)
  })

  it('hunk 正文里的 `diff --git` 与 `--- ` 不会被当成新的文件段', function () {
    const patch = [
      'diff --git a/readme.md b/readme.md',
      '--- a/readme.md',
      '+++ b/readme.md',
      '@@ -1,3 +1,3 @@',
      ' --- 分隔线说明',
      '-diff --git a/x b/x',
      '+diff --git a/y b/y'
    ].join('\n')

    const files = toDiffFiles(patch)
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('readme.md')
    expect(
      files[0].hunks[0].lines.map(function (line) {
        return line.text
      })
    ).toEqual(['--- 分隔线说明', 'diff --git a/x b/x', 'diff --git a/y b/y'])
  })

  it('忽略 `\\ No newline at end of file` 等非内容行', function () {
    const patch = [
      'diff --git a/src/a.ts b/src/a.ts',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1,1 +1,1 @@',
      '-old',
      '\\ No newline at end of file',
      '+new',
      '\\ No newline at end of file'
    ].join('\n')

    const files = toDiffFiles(patch)
    expect(files[0].hunks[0].lines).toHaveLength(2)
    expect(files[0].added).toBe(1)
    expect(files[0].removed).toBe(1)
  })

  it('没有 `diff --git` 前缀时靠 `---`/`+++` 定界', function () {
    const patch = ['--- a/x.ts', '+++ b/x.ts', '@@ -1 +1 @@', '-a', '+b'].join('\n')

    const files = toDiffFiles(patch)
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('x.ts')
  })

  it('解引号处理非 ASCII 路径', function () {
    const patch = [
      'diff --git "a/\\344\\270\\255\\346\\226\\207.md" "b/\\344\\270\\255\\346\\226\\207.md"',
      '--- "a/\\344\\270\\255\\346\\226\\207.md"',
      '+++ "b/\\344\\270\\255\\346\\226\\207.md"',
      '@@ -1 +1 @@',
      '-a',
      '+b'
    ].join('\n')

    expect(toDiffFiles(patch)[0].path).toBe('中文.md')
  })
})

describe('toDiffPreview', function () {
  it('空 patch 返回空预览', function () {
    expect(toDiffPreview('')).toEqual({ files: [], hidden: 0 })
    expect(toDiffPreview('   \n  ')).toEqual({ files: [], hidden: 0 })
  })

  it('超过行数预算时裁掉正文但保留文件头与真实增删计数', function () {
    const body = Array.from({ length: 30 }, function (_item, index) {
      return `+line ${index}`
    })
    const patch = [
      'diff --git a/big.ts b/big.ts',
      '--- a/big.ts',
      '+++ b/big.ts',
      '@@ -0,0 +1,30 @@',
      ...body
    ].join('\n')

    const preview = toDiffPreview(patch, 10)

    expect(preview.files).toHaveLength(1)
    expect(preview.files[0].path).toBe('big.ts')
    expect(preview.files[0].hunks[0].lines).toHaveLength(10)
    expect(preview.files[0].added).toBe(30)
    expect(preview.hidden).toBe(20)
  })

  it('预算够时不裁，hidden 为 0', function () {
    const preview = toDiffPreview(SINGLE_FILE)
    expect(preview.hidden).toBe(0)
    expect(preview.files[0].hunks[0].lines).toHaveLength(5)
  })
})
