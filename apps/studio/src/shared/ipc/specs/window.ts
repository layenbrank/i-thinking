import { z } from 'zod'

import type { ChannelOfDomain } from '../channels'
import { CHANNELS } from '../channels'
import type { ChannelSpec } from '../spec'

/**
 * 窗口域：只负责「把某个窗口开出来」这件事。
 *
 * 窗口的创建/聚焦在 `capabilities/agent-window.ts` 的端口里，渲染侧只发触发信号；
 * 无入参 —— 当前只有一种子窗口，参数化（路由/尺寸）等真有第二种窗口时再加。
 */
export const windowSpecs = {
  [CHANNELS.WINDOW.AGENT.OPEN]: { in: z.void(), out: z.void() }
} as const satisfies Record<ChannelOfDomain<'window'>, ChannelSpec>
