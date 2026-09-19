/**
 * Preload `exposeInMainWorld('itc', …)` 会挂到 window；
 * 浏览器环境下等同于全局绑定（与 setTimeout / window.setTimeout 同理）。
 * 声明 `var itc` 后可直接写 `itc.xxx`，不必 `window.itc`。
 */
import type { Api } from '@/shared/ipc/api'

/**
 * 拖放文件的本地路径。不是 IPC：File 过不了 invoke，preload 用 webUtils 现算。
 * 不放进 `Api`，否则会打破「顶层键 = IPC 域名」的契约断言。
 */
interface PathOf {
  pathOf(file: File): string
}

type Itc = Api & PathOf

declare global {
  interface Window {
    /** Preload: contextBridge.exposeInMainWorld('itc', …) */
    itc: Itc
  }

  /** 全局标识符，对应 window.itc（ambient 里 `var` 是唯一写法，`no-var` 不适用） */
  var itc: Itc
}

export {}
