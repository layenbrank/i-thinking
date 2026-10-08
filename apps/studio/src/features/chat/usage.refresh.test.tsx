// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { USAGE_KEY, useRefreshOnRunEnd } from './usage.ts'
import { QUOTA_KEY } from '@/features/quota/usage.ts'

afterEach(cleanup)

/**
 * 「对话结束后自动取一次用量」的回归测试。
 *
 * 探针挂两个**活的**查询：只有活跃查询会被 `invalidateQueries` 带着重拉，所以 queryFn 的调用
 * 次数就是「刷新有没有真的走到数据源」的证据 —— 断言缓存键被动过不算证据（那可能是空跑）。
 * `staleTime` 取应用里的默认值（60s），免得「没 stale 就不重拉」把边沿触发的重拉也一起糊掉。
 */
function createProbe() {
  const calls = { usage: 0, quota: 0 }

  function Probe(props: { isRunning: boolean }) {
    useRefreshOnRunEnd(props.isRunning)

    useQuery({
      queryKey: [USAGE_KEY, 'probe'],
      queryFn: function () {
        calls.usage += 1
        return calls.usage
      }
    })
    useQuery({
      queryKey: [QUOTA_KEY, 'probe'],
      queryFn: function () {
        calls.quota += 1
        return calls.quota
      }
    })

    return null
  }

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } }
  })

  function Tree(props: { isRunning: boolean }) {
    return (
      <QueryClientProvider client={client}>
        <Probe isRunning={props.isRunning} />
      </QueryClientProvider>
    )
  }

  function renderProbe(isRunning: boolean) {
    const view = render(<Tree isRunning={isRunning} />)

    return {
      calls,
      setRunning: function (next: boolean) {
        view.rerender(<Tree isRunning={next} />)
      }
    }
  }

  return { renderProbe }
}

describe('useRefreshOnRunEnd', function () {
  it('挂载与运行中都不拉：只在跑完的那一刻拉', async function () {
    const { renderProbe } = createProbe()
    const { calls, setRunning } = renderProbe(false)

    await waitFor(function () {
      expect(calls.usage).toBe(1)
    })
    expect(calls.quota).toBe(1)

    setRunning(true)

    expect(calls.usage).toBe(1)
    expect(calls.quota).toBe(1)
  })

  it('true → false 的边沿把用量与额度一起重拉', async function () {
    const { renderProbe } = createProbe()
    const { calls, setRunning } = renderProbe(true)

    await waitFor(function () {
      expect(calls.usage).toBe(1)
    })
    expect(calls.quota).toBe(1)

    setRunning(false)

    await waitFor(function () {
      expect(calls.usage).toBe(2)
    })
    expect(calls.quota).toBe(2)
  })

  it('一直是 idle 的重复渲染不会再拉（不然每次点别的按钮都要多一轮请求）', async function () {
    const { renderProbe } = createProbe()
    const { calls, setRunning } = renderProbe(false)

    await waitFor(function () {
      expect(calls.usage).toBe(1)
    })

    setRunning(false)
    setRunning(false)

    expect(calls.usage).toBe(1)
    expect(calls.quota).toBe(1)
  })
})
