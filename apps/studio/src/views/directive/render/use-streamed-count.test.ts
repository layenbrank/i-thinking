// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useStreamedCount } from './use-streamed-count'

describe('useStreamedCount', function () {
  beforeEach(function () {
    vi.useFakeTimers()
    // 统一走 setTimeout 退化路径，避免 jsdom 有无 idle API 导致计时器对不上
    vi.stubGlobal('requestIdleCallback', undefined)
    vi.stubGlobal('cancelIdleCallback', undefined)
  })

  afterEach(function () {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('首屏先露出一块，再空闲补齐', function () {
    const { result } = renderHook(function () {
      return useStreamedCount(40, 'a', 12)
    })

    expect(result.current).toBe(12)

    act(function () {
      vi.runAllTimers()
    })

    expect(result.current).toBe(40)
  })

  it('resetKey 变化时重新从第一块播', function () {
    const { result, rerender } = renderHook(
      function (props: { key: string; total: number }) {
        return useStreamedCount(props.total, props.key, 10)
      },
      { initialProps: { key: 'bucket', total: 25 } }
    )

    act(function () {
      vi.runAllTimers()
    })
    expect(result.current).toBe(25)

    rerender({ key: 'recent', total: 25 })
    // 必须同步归零：不能等 effect，否则会先闪一帧 25
    expect(result.current).toBe(10)

    act(function () {
      vi.runAllTimers()
    })
    expect(result.current).toBe(25)
  })

  it('total 变少时钳制，不超出新总量', function () {
    const { result, rerender } = renderHook(
      function (props: { total: number }) {
        return useStreamedCount(props.total, 'same', 10)
      },
      { initialProps: { total: 25 } }
    )

    act(function () {
      vi.runAllTimers()
    })
    expect(result.current).toBe(25)

    rerender({ total: 8 })
    expect(result.current).toBe(8)
  })
})
