import { z } from 'zod'

import { CHANNELS } from '../channels'
import type { ChannelOfDomain } from '../channels'
import type { ChannelSpec } from '../spec'

const UpdateSchema = z.object({
  visible: z.boolean()
})

const ReadSchema = z.object({
  visible: z.boolean()
})

export const overlaySpecs = {
  [CHANNELS.OVERLAY.READ]: { in: z.void(), out: ReadSchema },
  [CHANNELS.OVERLAY.UPDATE]: { in: UpdateSchema, out: z.void() }
} as const satisfies Record<ChannelOfDomain<'overlay'>, ChannelSpec>

export { ReadSchema, UpdateSchema }
