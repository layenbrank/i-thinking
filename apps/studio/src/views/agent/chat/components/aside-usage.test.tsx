// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as GatewayApi from '@/apis/gateway.ts'
import { AsideQuota } from './aside-usage.tsx'

/**
 * 「额度支持刷新按钮」这条要求落在右栏卡片上：卡片角上那颗按钮点下去必须真的再问一次服务端，
 * 而不是只动缓存键。这里用真组件 + 真 react-query（只把接口换成计数桩），把这条焊住。
 *
 * `useSelfQuota` 读的是 `GET_GATEWAY_QUOTA_ME`，所以计数就是「有没有再去问」。
 */
const harness = vi.hoisted(function () {
  return { token: 'token' as string | null, quotaCalls: 0 }
})

vi.mock('@/apis/gateway.ts', async function (importOriginal) {
  const actual = await importOriginal<typeof GatewayApi>()
  return {
    ...actual,
    GET_GATEWAY_QUOTA_ME: function () {
      harness.quotaCalls += 1
      const quota: GatewayApi.GatewaySelfQuota = {
        scope: 'USER',
        scopeID: 'u-1',
        source: 'FREE',
        limit: 1_000_000,
        used: 0,
        remaining: 1_000_000,
        exhausted: false,
        resetsAt: Date.UTC(2026, 0, 2)
      }
      return Promise.resolve(quota)
    }
  }
})

vi.mock('@/features/account/session.ts', function () {
  return {
    useAccountSession: function () {
      return { token: harness.token, profile: null, loading: false }
    }
  }
})

afterEach(function () {
  cleanup()
  harness.token = 'token'
  harness.quotaCalls = 0
})

function renderAside() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } }
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AsideQuota />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AsideQuota', function () {
  it('点刷新就再问一次额度，按钮 title 标出这次数字是什么时候取的', async function () {
    renderAside()

    const button = await screen.findByRole('button', { name: /^刷新 · 更新于 / })
    await waitFor(function () {
      expect(harness.quotaCalls).toBe(1)
    })

    fireEvent.click(button)

    await waitFor(function () {
      expect(harness.quotaCalls).toBe(2)
    })
  })

  it('没登录时不给刷新按钮：那边只会发一次被 401 打回来的请求', async function () {
    harness.token = null
    renderAside()

    expect(
      await screen.findByText('未登录：平台模型用不了，现在只能用本机模型或自备密钥的模型。')
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^刷新/ })).toBeNull()
    expect(harness.quotaCalls).toBe(0)
  })
})
