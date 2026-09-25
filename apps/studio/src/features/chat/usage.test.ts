import type { ThreadMessage } from '@assistant-ui/react'
import { describe, expect, it } from 'vitest'

import { formatUsage, formatUsageCompact, readUsage, sumUsage } from './usage'

describe('formatUsage', function () {
  it('没有用量时返回 null', function () {
    expect(formatUsage(undefined)).toBeNull()
  })

  it('缺字段用占位符', function () {
    expect(formatUsage({ inputTokens: 12 })).toBe('输入 12 · 输出 - · 合计 -')
  })

  it('字段齐全时逐项列出', function () {
    const text = formatUsage({ inputTokens: 10, outputTokens: 20, totalTokens: 30 })

    expect(text).toBe('输入 10 · 输出 20 · 合计 30')
  })
})

describe('formatUsageCompact', function () {
  it('没有可读字段时返回 null', function () {
    expect(formatUsageCompact(undefined)).toBeNull()
    expect(formatUsageCompact({})).toBeNull()
  })

  it('取合计；合计未知时不拿输入当合计', function () {
    expect(formatUsageCompact({ inputTokens: 1_200, totalTokens: 2_400 })).toBe('2k')
    expect(formatUsageCompact({ inputTokens: 1_200 })).toBeNull()
  })

  it('百万级用 M 口径', function () {
    expect(formatUsageCompact({ totalTokens: 1_500_000 })).toBe('2M')
  })
})

describe('readUsage · 从消息元数据里取用量', function () {
  it('按我们自己的契约读 custom.usage', function () {
    expect(readUsage({ custom: { usage: { inputTokens: 3, totalTokens: 9 } } })).toEqual({
      inputTokens: 3,
      totalTokens: 9
    })
  })

  it('形状不对一律当没有（不抛异常、不返回半截对象）', function () {
    for (const metadata of [
      undefined,
      null,
      'usage',
      {},
      { custom: null },
      { custom: { usage: null } },
      { custom: { usage: { inputTokens: '3' } } },
      { usage: { inputTokens: 3 } }
    ]) {
      expect(readUsage(metadata)).toBeUndefined()
    }
  })
})

describe('sumUsage · 会话累计用量', function () {
  function assistant(usage: unknown, role: 'assistant' | 'user' = 'assistant'): ThreadMessage {
    return {
      role,
      metadata: usage === null ? {} : { custom: { usage } }
    } as unknown as ThreadMessage
  }

  it('没有消息、没有一条报了用量时返回 undefined', function () {
    expect(sumUsage(undefined)).toBeUndefined()
    expect(sumUsage([])).toBeUndefined()
    expect(sumUsage([assistant(null), assistant(undefined)])).toBeUndefined()
  })

  it('逐条累加，跳过用户消息与没报用量的助手消息', function () {
    const result = sumUsage([
      assistant({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
      assistant(null),
      assistant({ totalTokens: 999 }, 'user'),
      assistant({ inputTokens: 2, outputTokens: 3 })
    ])

    expect(result).toEqual({ inputTokens: 12, outputTokens: 8, totalTokens: 20 })
  })

  it('provider 只报分项：合计按输入 + 输出兜底（底栏不必自己猜合计）', function () {
    expect(sumUsage([assistant({ inputTokens: 7 })])).toEqual({ inputTokens: 7, totalTokens: 7 })
  })

  it('单条缺的分项保持缺失，不写成 0', function () {
    expect(sumUsage([assistant({ totalTokens: 4 })])).toEqual({ totalTokens: 4 })
  })

  /**
   * 累计是**派生**对象：每次调用都是新引用，所以它绝不能当 `useAuiState` 的选区
   * （选区按 `Object.is` 比对，每帧新对象 → 强制重渲染 → Maximum update depth exceeded）。
   * 选区只回 `state.thread.messages` 原引用，派生放在 `useMemo` 里（见 `useThreadUsage`）。
   */
  it('返回值是派生对象：同输入等值、不同引用', function () {
    const messages = [assistant({ totalTokens: 3 })]

    expect(sumUsage(messages)).toEqual(sumUsage(messages))
    expect(sumUsage(messages)).not.toBe(sumUsage(messages))
  })
})
