// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RefreshButton } from '@/features/quota/refresh-button.tsx'

afterEach(cleanup)

describe('RefreshButton', function () {
  it('点了就叫一次刷新', function () {
    const onRefresh = vi.fn()
    render(
      <RefreshButton
        isFetching={false}
        onRefresh={onRefresh}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '刷新' }))

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('请求在飞时禁用：连点只会叠请求，没必要放行', function () {
    const onRefresh = vi.fn()
    render(
      <RefreshButton
        isFetching
        onRefresh={onRefresh}
      />
    )

    const button = screen.getByRole('button', { name: '刷新' })
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('只有图标时把 label 当无障碍名：屏幕阅读器不能念出一个没有名字的按钮', function () {
    render(
      <RefreshButton
        iconOnly
        isFetching={false}
        label="刷新 · 更新于 12:03:45"
        onRefresh={function () {}}
      />
    )

    const button = screen.getByRole('button', { name: '刷新 · 更新于 12:03:45' })
    expect(button).toHaveAttribute('title', '刷新 · 更新于 12:03:45')
    expect(button.textContent).toBe('')
  })
})
