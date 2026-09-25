// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TERMINAL_PREVIEW_LINES } from '@/views/agent/chat/components/tool-output.ts'
import { ToolCodeMode, ToolCommand } from '@/views/agent/chat/components/tool-terminal.tsx'

function toLines(count: number): string {
  return Array.from({ length: count }, function (_, index) {
    return `line ${index}`
  }).join('\n')
}

function toShellState(container: HTMLElement): string | null {
  return container.querySelector('[data-state]')?.getAttribute('data-state') ?? null
}

describe('ToolCommand', function () {
  it('顶栏给提示符、命令、工作目录与后台标记，输出原样铺开', function () {
    const { container } = render(
      <ToolCommand
        command="pnpm test"
        workdir="apps/studio"
        background
        output={'a\nb'}
        isError={false}
        isRunning={false}
      />
    )

    expect(container.textContent).toContain('pnpm test')
    expect(container.textContent).toContain('apps/studio')
    expect(container.textContent).toContain('后台')
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
    expect(toShellState(container)).toBe('done')
  })

  it('有输出时不再挂一句「无输出」', function () {
    const { container } = render(
      <ToolCommand
        command="ls"
        workdir={null}
        background={false}
        output="file.txt"
        isError={false}
        isRunning={false}
      />
    )

    expect(container.textContent).not.toContain('无输出')
  })

  it('还没出结果时只显示「执行中…」，状态是 running', function () {
    const { container } = render(
      <ToolCommand
        command="pnpm build"
        workdir={null}
        background={false}
        output={null}
        isError={false}
        isRunning
      />
    )

    expect(container.textContent).toContain('执行中…')
    expect(toShellState(container)).toBe('running')
  })

  it('失败且没有输出时说明「没有任何输出」，状态是 error', function () {
    const { container } = render(
      <ToolCommand
        command="pnpm lint"
        workdir={null}
        background={false}
        output={null}
        isError
        isRunning={false}
      />
    )

    expect(container.textContent).toContain('没有任何输出')
    expect(toShellState(container)).toBe('error')
  })

  it('长输出默认折叠，点「展开全部」后全铺出来', function () {
    const total = TERMINAL_PREVIEW_LINES + 5

    render(
      <ToolCommand
        command="pnpm test"
        workdir={null}
        background={false}
        output={toLines(total)}
        isError={false}
        isRunning={false}
      />
    )

    expect(screen.queryByText(`line ${total - 1}`)).toBeNull()

    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByText(`line ${total - 1}`)).toBeInTheDocument()
    expect(screen.queryByText('展开全部（还有 5 行）', { exact: false })).toBeNull()
  })
})

describe('ToolCodeMode', function () {
  it('源码与返回分两块，标题标明是 Code Mode', function () {
    const { container } = render(
      <ToolCodeMode
        source="return 1 + 1"
        output="2"
        isError={false}
        isRunning={false}
      />
    )

    expect(container.textContent).toContain('Code Mode · JavaScript')
    expect(screen.getByText('return 1 + 1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(container.textContent).not.toContain('无返回')
  })

  it('没有返回时在源码下方说明「无返回」', function () {
    const { container } = render(
      <ToolCodeMode
        source="await shell('ls')"
        output={null}
        isError={false}
        isRunning={false}
      />
    )

    expect(container.textContent).toContain('无返回')
  })
})
