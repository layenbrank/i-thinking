import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const checkUpdate = vi.fn(function () {
  return Promise.resolve()
})
const dismissPendingUpdate = vi.fn()
let pendingVersion: string | null = null
let corexReady: boolean | null = true

vi.mock('@/utils/updater', function () {
  return {
    autoCheckUpdate: vi.fn(function () {
      return Promise.resolve()
    }),
    checkUpdate: function () {
      return checkUpdate()
    },
    dismissPendingUpdate: function () {
      dismissPendingUpdate()
    },
    findPendingUpdateVersion: function () {
      return pendingVersion
    },
    subscribeUpdateStatus: function () {
      return function () {}
    }
  }
})

vi.mock('@tauri-apps/api/core', function () {
  return {
    invoke: function () {
      return Promise.resolve(corexReady)
    }
  }
})

vi.mock('@tauri-apps/api/event', function () {
  return {
    listen: function () {
      return Promise.resolve(function () {})
    }
  }
})

import { CaptionStatus } from '@/views/overview/caption/status.tsx'

beforeEach(function () {
  pendingVersion = null
  corexReady = true
  checkUpdate.mockClear()
  dismissPendingUpdate.mockClear()
})

describe('CaptionStatus', function () {
  it('一切正常时不渲染任何芯片', async function () {
    render(<CaptionStatus />)
    // 等一次异步就绪检查落定后再断言
    await waitFor(function () {
      expect(screen.queryByText(/corex 未就绪/)).not.toBeInTheDocument()
    })
    expect(screen.queryByText(/可更新/)).not.toBeInTheDocument()
  })

  it('有可用更新时出现「可更新」芯片：点击检查、✕ 忽略', async function () {
    pendingVersion = '9.9.9'
    render(<CaptionStatus />)

    const chip = await screen.findByRole('button', { name: /可更新 9\.9\.9/ })
    fireEvent.click(chip)
    expect(checkUpdate).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '忽略本次更新提醒' }))
    expect(dismissPendingUpdate).toHaveBeenCalledTimes(1)
  })

  it('corex 未就绪时出现告警芯片，点击重新检测', async function () {
    corexReady = false
    render(<CaptionStatus />)

    const chip = await screen.findByRole('button', { name: /corex 未就绪/ })
    expect(chip).toBeInTheDocument()
    fireEvent.click(chip)
  })
})
