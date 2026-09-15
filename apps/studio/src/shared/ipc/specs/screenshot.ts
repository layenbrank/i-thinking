import { z } from 'zod'

import { CHANNELS } from '../channels'
import type { ChannelOfDomain } from '../channels'
import type { ChannelSpec } from '../spec'

/** 截屏 IPC 无业务入参；路径由 Main 生成 */
const CaptureSchema = z.object({}).optional()

const ResultSchema = z.object({
  path: z.string(),
  width: z.number(),
  height: z.number()
})

export const screenshotSpecs = {
  [CHANNELS.SCREENSHOT.CAPTURE]: { in: CaptureSchema, out: ResultSchema }
} as const satisfies Record<ChannelOfDomain<'screenshot'>, ChannelSpec>

export { CaptureSchema, ResultSchema }
