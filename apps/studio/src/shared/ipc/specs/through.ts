import { z } from 'zod'

import { CHANNELS } from '@/shared/ipc/channels'
import type { ChannelOfDomain } from '@/shared/ipc/channels'
import type { ChannelSpec } from '@/shared/ipc/spec'

const RectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number()
})

const UpdateRectsSchema = z.object({
  source: z.string().min(1),
  rects: z.array(RectSchema)
})

export const throughSpecs = {
  [CHANNELS.THROUGH.UPDATE_RECTS]: { in: UpdateRectsSchema, out: z.void() }
} as const satisfies Record<ChannelOfDomain<'through'>, ChannelSpec>

export { RectSchema, UpdateRectsSchema }
