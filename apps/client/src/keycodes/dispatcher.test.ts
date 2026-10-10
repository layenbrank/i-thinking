import { afterEach, describe, expect, it, vi } from 'vitest'

import { dispatchKeyCode, registerKeyCodeHandler } from '@/keycodes/dispatcher'

/** 注册表是模块级单例：每个用例结束自己注销，避免互相污染 */
const disposers: Array<() => void> = []

function register(
  handler: () => boolean | void | Promise<boolean | void>,
  options?: { priority?: number; enabled?: () => boolean }
) {
  const dispose = registerKeyCodeHandler('screenshot', handler, options)
  disposers.push(dispose)
  return dispose
}

afterEach(function () {
  while (disposers.length > 0) disposers.pop()?.()
})

describe('keycode dispatcher', function () {
  it('returns false when nothing is registered', async function () {
    await expect(dispatchKeyCode('screenshot')).resolves.toBe(false)
  })

  it('returns true when a handler claims the key', async function () {
    const handler = vi.fn(function () {
      return true
    })
    register(handler)

    await expect(dispatchKeyCode('screenshot')).resolves.toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('returns false when every handler declines', async function () {
    register(function () {
      return false
    })
    register(function () {})

    await expect(dispatchKeyCode('screenshot')).resolves.toBe(false)
  })

  it('stops at the first handler that claims the key', async function () {
    const first = vi.fn(function () {
      return true
    })
    const second = vi.fn(function () {
      return true
    })
    register(second, { priority: 0 })
    register(first, { priority: 10 })

    await expect(dispatchKeyCode('screenshot')).resolves.toBe(true)
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
  })

  it('picks the later registration among equal priorities', async function () {
    const calls: string[] = []
    register(function () {
      calls.push('first')
      return true
    })
    register(function () {
      calls.push('second')
      return true
    })

    await dispatchKeyCode('screenshot')
    expect(calls).toEqual(['second'])
  })

  it('skips handlers disabled at dispatch time', async function () {
    const skipped = vi.fn(function () {
      return true
    })
    register(skipped, { enabled: function () {
      return false
    } })

    await expect(dispatchKeyCode('screenshot')).resolves.toBe(false)
    expect(skipped).not.toHaveBeenCalled()
  })

  it('keeps going when a handler throws', async function () {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(function () {})
    const survivor = vi.fn(function () {
      return true
    })
    register(function () {
      throw new Error('boom')
    })
    register(survivor)

    await expect(dispatchKeyCode('screenshot')).resolves.toBe(true)
    expect(survivor).toHaveBeenCalledTimes(1)
    consoleError.mockRestore()
  })

  it('drops unregistered handlers', async function () {
    const handler = vi.fn(function () {
      return true
    })
    const dispose = register(handler)

    dispose()
    await expect(dispatchKeyCode('screenshot')).resolves.toBe(false)
    expect(handler).not.toHaveBeenCalled()
  })
})
