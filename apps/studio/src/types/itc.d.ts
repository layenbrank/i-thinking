/**
 * Preload `exposeInMainWorld('itc', …)` 会挂到 window；
 * 浏览器环境下等同于全局绑定（与 setTimeout / window.setTimeout 同理）。
 * 声明 `var itc` 后可直接写 `itc.xxx`，不必 `window.itc`。
 */
import type { ITC } from '@/plugins/itc'

declare global {
  interface Window {
    /** Preload: contextBridge.exposeInMainWorld('itc', …) */
    itc: ITC
  }

  /** 全局标识符，对应 window.itc */
  // eslint-disable-next-line no-var
  var itc: ITC
}

export {}
