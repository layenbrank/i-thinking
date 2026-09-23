import { z } from 'zod'

import type { ChannelOfDomain } from '../channels'
import { CHANNELS } from '../channels'
import type { ChannelSpec } from '../spec'
import { LAZY_WINDOW_KEYS } from '../../windows'

/**
 * 窗口域：只负责「把某个按需窗口开出来」这件事。
 *
 * 键是唯一入参 —— 窗口的创建/聚焦在 host/capabilities/window-registry.ts 的端口里，
 * 规格（尺寸/标题/路由）也在那里。新增一个按需窗口因此不需要新频道。
 */
const windowKey = z.enum(LAZY_WINDOW_KEYS)

export const windowSpecs = {
  [CHANNELS.WINDOW.OPEN]: { in: z.object({ key: windowKey }), out: z.void() }
} as const satisfies Record<ChannelOfDomain<'window'>, ChannelSpec>
