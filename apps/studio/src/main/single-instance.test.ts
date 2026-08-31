import { describe, expect, it, vi } from 'vitest'
import { acquireSingleInstanceLock, focusWindow } from './single-instance'

describe('single-instance', function () {
  it('acquireSingleInstanceLock delegates to app', function () {
    const requestSingleInstanceLock = vi.fn().mockReturnValue(true)
    const app = { requestSingleInstanceLock } as never
    expect(acquireSingleInstanceLock(app)).toBe(true)
    expect(requestSingleInstanceLock).toHaveBeenCalledOnce()
  })

  it('focusWindow restores minimized and focuses', function () {
    const restore = vi.fn()
    const show = vi.fn()
    const focus = vi.fn()
    const win = {
      isDestroyed: () => false,
      isMinimized: () => true,
      isVisible: () => true,
      restore,
      show,
      focus
    }
    focusWindow(win as never)
    expect(restore).toHaveBeenCalledOnce()
    expect(show).not.toHaveBeenCalled()
    expect(focus).toHaveBeenCalledOnce()
  })

  it('focusWindow shows hidden window', function () {
    const show = vi.fn()
    const focus = vi.fn()
    const win = {
      isDestroyed: () => false,
      isMinimized: () => false,
      isVisible: () => false,
      restore: vi.fn(),
      show,
      focus
    }
    focusWindow(win as never)
    expect(show).toHaveBeenCalledOnce()
    expect(focus).toHaveBeenCalledOnce()
  })

  it('focusWindow ignores null or destroyed', function () {
    expect(function () {
      focusWindow(null)
    }).not.toThrow()
    focusWindow({
      isDestroyed: () => true,
      isMinimized: () => false,
      isVisible: () => false,
      restore: vi.fn(),
      show: vi.fn(),
      focus: vi.fn()
    } as never)
  })
})
