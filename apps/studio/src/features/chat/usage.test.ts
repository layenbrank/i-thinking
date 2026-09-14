import { describe, expect, it } from 'vitest'

import { formatUsage } from './usage'

describe('formatUsage', function () {
  it('没有用量时返回 null', function () {
    expect(formatUsage(undefined)).toBeNull()
  })

  it('缺字段用占位符', function () {
    expect(formatUsage({ inputTokens: 12 })).toBe('输入 12 · 输出 - · 合计 -')
  })

  it('含推理与缓存时追加字段', function () {
    const text = formatUsage({
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      reasoningTokens: 5,
      cachedInputTokens: 4
    })

    expect(text).toBe('输入 10 · 输出 20 · 合计 30 · 推理 5 · 缓存 4')
  })
})
