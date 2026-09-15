import { ipcRenderer } from 'electron'

import type { Subscribe } from './shared/ipc/api'
import { CHANNELS } from './shared/ipc/channels'
import type { PushOut } from './shared/ipc/specs'

/**
 * 离线通路的端口交付：主进程收到 connect 后把端口推过来，而 renderer 侧的消费者
 * 可能在 connect 之后才注册回调 —— 这里先排队，避免丢端口（竞态）。
 *
 * 逐字自 preload.ts 搬出，**队列逻辑一行未改**：这是本文件唯一无测试覆盖的
 * 运行时路径，改动风险不值得。
 */
const portCallbacks = new Set<(port: MessagePort) => void>()
const pendingPorts: MessagePort[] = []

ipcRenderer.on(CHANNELS.ASSISTANT.PORT, function (event) {
  const port = event.ports[0]
  if (!port) return
  if (portCallbacks.size === 0) {
    pendingPorts.push(port)
    return
  }
  portCallbacks.forEach(function (callback) {
    callback(port)
  })
})

/** 订阅离线通路端口；返回退订函数 */
export const subscribePort: Subscribe<PushOut<typeof CHANNELS.ASSISTANT.PORT>> = function (callback) {
  portCallbacks.add(callback)
  // 把先于注册到达的端口补交给它
  while (pendingPorts.length > 0) {
    const port = pendingPorts.shift()
    if (port) callback(port)
  }
  return function unsubscribe() {
    portCallbacks.delete(callback)
  }
}
