import { ASSISTANT_PORT_MESSAGE } from '@/shared/ipc/assistant-port.ts'

/**
 * 主世界侧的端口交付：preload 用 `window.postMessage` 把主进程推来的 MessagePort 转交过来
 * （见 `shared/ipc/assistant-port.ts` 里为什么不能走 contextBridge），这里接住并分发给订阅者。
 *
 * 端口只会**晚到**不会早到：`itc.assistant.connect()` 由订阅者发起（先订阅再 connect），
 * 主进程只在 connect 之后才发端口。监听因此**懒注册**（首次订阅时挂）—— 模块导入保持无副作用，
 * 否则 node 环境的单测（如 `model.test.ts` 会 import 本模块）导入时就摸 `window` 直接炸。
 *
 * 仍然保留队列：订阅者尚未注册时到达的端口要能补交，不丢。
 *
 * 端口**必须显式 `start()`**：转交过来的端口初始是「未启动」状态，只有 `start()`（或赋 `onmessage`）
 * 才会打开收件队列，仅挂 `addEventListener` 一条消息都收不到（实测 Electron 44）。开闸放在交付边界，
 * 保证订阅者拿到的端口一定可用 —— 否则表现为主进程正常跑完、界面与终端却毫无动静。
 */
const subscribers = new Set<(port: MessagePort) => void>()
const pending: MessagePort[] = []
let listening = false

function offerAssistantPort(port: MessagePort): void {
  if (subscribers.size === 0) {
    pending.push(port)
    return
  }
  subscribers.forEach(function (subscriber) {
    subscriber(port)
  })
}

function listen(): void {
  if (listening) return
  listening = true

  window.addEventListener('message', function (event) {
    if (event.source !== window) return
    if (event.data !== ASSISTANT_PORT_MESSAGE) return
    const [port] = event.ports
    if (!port) return
    port.start()
    offerAssistantPort(port)
  })
}

/** 订阅 agent 运行时端口；返回退订函数 */
function subscribeAssistantPort(subscriber: (port: MessagePort) => void): () => void {
  listen()
  subscribers.add(subscriber)
  // 把先于注册到达的端口补交给它
  while (pending.length > 0) {
    const port = pending.shift()
    if (port) subscriber(port)
  }
  return function (): void {
    subscribers.delete(subscriber)
  }
}

export { subscribeAssistantPort }
