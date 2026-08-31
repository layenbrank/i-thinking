import type { ITC } from '@shared/ipc/studio'

/**
 * 在 Electron 渲染进程中优先直接用全局 `itc`（与 `setTimeout` 同理）。
 * 仅在需要显式探测「是否挂载成功」（如纯网页 `dev:core`）时用本函数。
 */
export function findITC(): ITC {
  if (typeof itc === 'undefined') {
    throw new Error('itc is unavailable (not running in Electron?)')
  }
  return itc
}

export type { ITC }
