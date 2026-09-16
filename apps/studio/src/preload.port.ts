import { ipcRenderer } from 'electron'

import { ASSISTANT_PORT_MESSAGE } from './shared/ipc/assistant-port'
import { CHANNELS } from './shared/ipc/channels'

/**
 * 离线通路的端口交付：主进程收到 connect 后把端口推过来，这里接一手并**原样转交给主世界**。
 *
 * 必须用 `window.postMessage` 的 transfer list，**不能**当作 contextBridge 回调的参数传：
 * 过桥的端口会退化成没有 `addEventListener` 的代理对象（实测报
 * `channel.addEventListener is not a function`）。排队与订阅因此都落在主世界
 * （`@/features/chat/port/assistant-port.ts`）。
 */
function attachAssistantPort(): void {
  ipcRenderer.on(CHANNELS.ASSISTANT.PORT, function (event) {
    const port = event.ports[0]
    if (!port) return
    window.postMessage(ASSISTANT_PORT_MESSAGE, '*', [port])
  })
}

export { attachAssistantPort }
