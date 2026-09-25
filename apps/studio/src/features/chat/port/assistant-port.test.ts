// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

import { ASSISTANT_PORT_MESSAGE } from '@/shared/ipc/assistant-port.ts'

import { subscribeAssistantPort } from './assistant-port.ts'

/** 断言用假端口：jsdom 拿不到真的 MessagePort，这里只关心「哪个对象被交付了」以及有没有开闸 */
function buildFakePort(): MessagePort {
  return { postMessage: vi.fn(), start: vi.fn() } as unknown as MessagePort
}

/** 模拟 preload 的 `window.postMessage(msg, '*', [port])` */
function deliverPort(port: MessagePort, source: Window | null = window): void {
  const event = new MessageEvent('message', { data: ASSISTANT_PORT_MESSAGE, source })
  Object.defineProperty(event, 'ports', { value: [port] })
  window.dispatchEvent(event)
}

describe('assistant MessagePort 交付', function () {
  it('端口到达时交给已注册的订阅者', function () {
    const port = buildFakePort()
    const seen: MessagePort[] = []
    const unsubscribe = subscribeAssistantPort(function (next) {
      seen.push(next)
    })

    deliverPort(port)

    expect(seen).toEqual([port])
    unsubscribe()
  })

  it('没有订阅者时到达的端口，会在下次订阅时补交', function () {
    const port = buildFakePort()
    // 先订阅一次把懒注册的监听挂上，再退订，模拟「端口到达时无人订阅」
    const first = subscribeAssistantPort(function () {})
    first()
    deliverPort(port)

    const seen: MessagePort[] = []
    const second = subscribeAssistantPort(function (next) {
      seen.push(next)
    })

    expect(seen).toEqual([port])
    second()
  })

  it('端口在交付前已开闸（不 start 就一条消息都收不到）', function () {
    const port = buildFakePort()
    const order: string[] = []
    ;(port.start as unknown as () => void) = function () {
      order.push('start')
    }

    const unsubscribe = subscribeAssistantPort(function () {
      order.push('deliver')
    })

    deliverPort(port)

    expect(order).toEqual(['start', 'deliver'])
    unsubscribe()
  })

  it('忽略不是本窗口发来的同标签消息', function () {
    const port = buildFakePort()
    const seen: MessagePort[] = []
    const unsubscribe = subscribeAssistantPort(function (next) {
      seen.push(next)
    })

    deliverPort(port, null)

    expect(seen).toHaveLength(0)
    unsubscribe()
  })

  it('退订后不再收到端口', function () {
    const port = buildFakePort()
    const seen: MessagePort[] = []
    const unsubscribe = subscribeAssistantPort(function (next) {
      seen.push(next)
    })
    unsubscribe()

    deliverPort(port)

    expect(seen).toHaveLength(0)
  })
})
