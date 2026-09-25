// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DiffView } from '@/views/agent/chat/components/diff-view.tsx'

/** 单文件 patch：一行上下文 + `addCount` 行新增（用来踩 200 行的裁剪预算） */
function toPatch(addCount: number): string {
  const body = Array.from({ length: addCount }, function (_, index) {
    return `+const line${index} = ${index}`
  })

  return [
    'diff --git a/src/a.ts b/src/a.ts',
    'index 1111111..2222222 100644',
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    `@@ -1,1 +1,${addCount + 1} @@`,
    ' const a = 1',
    ...body
  ].join('\n')
}

describe('DiffView', function () {
  it('空 patch 给一句说明，而不是一片空白', function () {
    render(<DiffView patch="" />)

    expect(screen.getByText('没有可展示的差异。')).toBeInTheDocument()
  })

  it('文件头给路径与增删行数，正文给 hunk 头与行号', function () {
    const { container } = render(<DiffView patch={toPatch(2)} />)

    expect(screen.getByText('src/a.ts')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(screen.getByText('−0')).toBeInTheDocument()
    expect(screen.getByText('@@ -1,1 +1,3 @@')).toBeInTheDocument()
    expect(screen.getByText('const line0 = 0')).toBeInTheDocument()
    expect(container.textContent).toContain('const a = 1')
  })

  it('超过预算的正文先折起来，点「展开剩余」后全部铺出', function () {
    render(<DiffView patch={toPatch(205)} />)

    expect(screen.queryByText('const line204 = 204')).toBeNull()

    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByText('const line204 = 204')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
