/**
 * 离线通路的 MessagePort 交付标签（preload 的世界 → 主世界）。
 *
 * 为什么需要它：`MessagePort` **不能**当作 contextBridge 回调的参数传 —— 过了桥会退化成
 * 没有 `addEventListener` 的代理对象（实测报 `channel.addEventListener is not a function`）。
 * Electron 官方的做法是 preload 用 `window.postMessage(msg, '*', [port])` 的 transfer list
 * 把端口搬进主世界，主世界 `event.ports` 拿到的才是真正的 MessagePort。
 *
 * 两边（`preload.port.ts` 与 `features/chat/port/assistant-port.ts`）共用这一个标签，
 * 避免字符串各写一份漂移。
 */
const ASSISTANT_PORT_MESSAGE = 'ith:assistant-port'

export { ASSISTANT_PORT_MESSAGE }
