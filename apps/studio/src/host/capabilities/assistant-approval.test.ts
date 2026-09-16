import { describe, expect, it, vi } from 'vitest'

import { createApprovalTicket } from './assistant-approval'

/**
 * 「审批永远落地」的回归测试：回执、abort、超时三条出口，
 * 任何一条漏掉都会让一次运行永久挂住（工具 execute 不再返回）。
 */

function buildSignal(): AbortController {
  return new AbortController()
}

describe('createApprovalTicket', function () {
  it('resolves with the renderer decision', async function () {
    const controller = buildSignal()
    const ticket = createApprovalTicket({ signal: controller.signal, timeoutMs: 1000 })

    ticket.settle(true)

    await expect(ticket.decision).resolves.toBe(true)
  })

  it('resolves false when denied', async function () {
    const controller = buildSignal()
    const ticket = createApprovalTicket({ signal: controller.signal, timeoutMs: 1000 })

    ticket.settle(false)

    await expect(ticket.decision).resolves.toBe(false)
  })

  it('ignores a repeated decision', async function () {
    const controller = buildSignal()
    const ticket = createApprovalTicket({ signal: controller.signal, timeoutMs: 1000 })

    ticket.settle(true)
    ticket.settle(false)

    await expect(ticket.decision).resolves.toBe(true)
  })

  it('falls back to denied when the run aborts', async function () {
    const controller = buildSignal()
    const ticket = createApprovalTicket({ signal: controller.signal, timeoutMs: 1000 })

    controller.abort()

    await expect(ticket.decision).resolves.toBe(false)
  })

  it('falls back to denied when the run was already aborted', async function () {
    const controller = buildSignal()
    controller.abort()

    const ticket = createApprovalTicket({ signal: controller.signal, timeoutMs: 1000 })

    await expect(ticket.decision).resolves.toBe(false)
  })

  it('falls back to denied on timeout', async function () {
    vi.useFakeTimers()
    try {
      const controller = buildSignal()
      const ticket = createApprovalTicket({ signal: controller.signal, timeoutMs: 50 })

      vi.advanceTimersByTime(50)

      await expect(ticket.decision).resolves.toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('lets a late decision be ignored after dispose', async function () {
    const controller = buildSignal()
    const ticket = createApprovalTicket({ signal: controller.signal, timeoutMs: 1000 })

    ticket.dispose()
    ticket.settle(true)

    await expect(ticket.decision).resolves.toBe(false)
  })
})
