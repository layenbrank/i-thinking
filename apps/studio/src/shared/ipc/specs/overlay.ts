import { z } from 'zod'

import { CHANNELS } from '@/shared/ipc/channels'
import type { ChannelOfDomain } from '@/shared/ipc/channels'
import type { ChannelSpec, PushChannelSpec } from '@/shared/ipc/spec'
import { BytesSchema } from './capture'

const OverlayModeSchema = z.enum(['idle', 'capture'])

const UpdateSchema = z.object({
  visible: z.boolean().optional(),
  mode: OverlayModeSchema.optional()
})

const ReadSchema = z.object({
  visible: z.boolean(),
  mode: OverlayModeSchema
})

const EventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('conceal') }),
  z.object({ type: z.literal('reveal') }),
  z.object({ type: z.literal('mode'), mode: OverlayModeSchema }),
  z.object({
    type: z.literal('session'),
    path: z.string(),
    width: z.number(),
    height: z.number(),
    /** PNG 原始字节；渲染侧立刻转 Blob URL 后应丢弃 */
    bytes: BytesSchema
  })
])

export const overlaySpecs = {
  [CHANNELS.OVERLAY.READ]: { in: z.void(), out: ReadSchema },
  [CHANNELS.OVERLAY.UPDATE]: { in: UpdateSchema, out: z.void() }
} as const satisfies Record<
  Exclude<ChannelOfDomain<'overlay'>, typeof CHANNELS.OVERLAY.EVENT>,
  ChannelSpec
>

export const overlayPushSpec = {
  [CHANNELS.OVERLAY.EVENT]: { out: EventSchema }
} as const satisfies Record<typeof CHANNELS.OVERLAY.EVENT, PushChannelSpec>

export { ReadSchema, UpdateSchema, EventSchema, OverlayModeSchema }
