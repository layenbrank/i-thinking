import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useSessionStore } from '@/stores/session.ts'
import { CaptionAccount } from '@/views/overview/caption/account.tsx'

/** zustand store 是模块级单例：每个用例自己复位 */
afterEach(function () {
  useSessionStore.setState({ user: null })
})

describe('CaptionAccount', function () {
  it('未登录时渲染登录按钮，点击回调 onSignIn', function () {
    const onSignIn = vi.fn()
    render(<CaptionAccount onSignIn={onSignIn} />)

    fireEvent.click(screen.getByRole('button', { name: '登录' }))
    expect(onSignIn).toHaveBeenCalledTimes(1)
  })

  it('已登录时点头像打开菜单，菜单里能退出登录', function () {
    useSessionStore.setState({ user: { id: 'u1', username: 'iwell', avatarUrl: null } })
    render(<CaptionAccount onSignIn={vi.fn()} />)

    const trigger = screen.getByRole('button', { name: '已登录：iwell' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')

    // base-ui 的菜单在 click 打开（mousedown / pointerdown 都不触发）
    fireEvent.click(trigger)

    expect(screen.getByText('iwell')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: '退出登录' }))
    expect(useSessionStore.getState().user).toBeNull()
  })
})
