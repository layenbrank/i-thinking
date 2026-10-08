import { afterEach, describe, expect, it, vi } from 'vitest'

import { reportOnce } from './report'

describe('reportOnce', function () {
  afterEach(function () {
    vi.restoreAllMocks()
  })

  it('reports the same message only once', function () {
    const warn = vi.spyOn(console, 'warn').mockImplementation(function () {})

    reportOnce('探测失败 a')
    reportOnce('探测失败 a')
    reportOnce('探测失败 b')

    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('drops the dedupe table instead of growing without bound', function () {
    const warn = vi.spyOn(console, 'warn').mockImplementation(function () {})

    // 每条都是新消息 → 每条都报一次：此时去重表在涨
    for (let index = 0; index < 300; index += 1) {
      reportOnce(`探测失败 ${index}`)
    }
    expect(warn).toHaveBeenCalledTimes(300)

    // 到顶后整表被清掉：早就报过的那条会再报一次。没有上限的话这里会静默。
    warn.mockClear()
    reportOnce('探测失败 100')
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
