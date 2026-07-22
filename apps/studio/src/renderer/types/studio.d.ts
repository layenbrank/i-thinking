/**
 * 将 StudioApi 挂到全局 Window，供 `window.studio` IntelliSense。
 * 必须使用 declare global + export {}，勿用 ambient 里的 import('…').StudioApi。
 */
import type { Studio } from '@shared/ipc/contracts'

declare global {
  interface Window {
    /** Preload: contextBridge.exposeInMainWorld('studio', …) */
    readonly studio: Studio
  }
}

export {}
