// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RuntimeNotice } from './notice.tsx'

/** 工具状态由测试喂：只有 opencode 缺失时才多出这条提示 */
const tools = vi.hoisted(function () {
  return { rows: [] as { key: string; label: string; state: string }[] }
})

const navigation = vi.hoisted(function () {
  return { to: '' }
})

vi.mock('@/features/tool/query.ts', function () {
  return {
    useTools: function () {
      return { data: tools.rows, isLoading: false, isError: false }
    }
  }
})

vi.mock('react-router-dom', function () {
  return {
    useNavigate: function () {
      return function (to: string) {
        navigation.to = to
      }
    }
  }
})

describe('RuntimeNotice', function () {
  beforeEach(function () {
    tools.rows = []
    navigation.to = ''
  })

  afterEach(function () {
    cleanup()
  })

  it('运行时没装时，给一条去下载的入口', function () {
    tools.rows = [{ key: 'opencode', label: 'OpenCode', state: 'missing' }]

    render(<RuntimeNotice />)

    expect(screen.getByText(/对话要用到 OpenCode/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /去下载/ })).toBeInTheDocument()
  })

  it('运行时已装好时不打扰用户', function () {
    tools.rows = [{ key: 'opencode', label: 'OpenCode', state: 'bundled' }]

    render(<RuntimeNotice />)

    expect(screen.queryByText(/对话要用到 OpenCode/)).not.toBeInTheDocument()
  })

  it('别的工具缺了不在这里报：那些功能自己会说明', function () {
    tools.rows = [{ key: 'pandoc', label: 'Pandoc', state: 'missing' }]

    render(<RuntimeNotice />)

    expect(screen.queryByRole('button', { name: /去下载/ })).not.toBeInTheDocument()
  })
})
