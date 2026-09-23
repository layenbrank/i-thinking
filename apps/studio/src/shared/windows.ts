/**
 * 按需创建的窗口键。
 *
 * 一条事实三端共用：主进程据此建窗与建端口（host/capabilities/window-registry.ts）、
 * IPC 契约据此校验入参（shared/ipc/specs/window.ts）、渲染侧据此请求开窗。
 * 新增一个按需窗口 = 这里加一个键 + 窗口注册表加一条规格，其余全由表驱动。
 *
 * 本文件被渲染进程引用，禁止 import electron / node / DOM。
 */
const LAZY_WINDOW_KEYS = ['agent', 'directive'] as const

type LazyWindowKey = (typeof LAZY_WINDOW_KEYS)[number]

export { LAZY_WINDOW_KEYS }
export type { LazyWindowKey }
