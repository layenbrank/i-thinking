import { z } from 'zod'

import { CHANNELS } from '../channels'
import type { ChannelOfDomain } from '../channels'
import type { ChannelSpec } from '../spec'

const StatusSchema = z.object({
  enabled: z.boolean(),
  checking: z.boolean(),
  downloading: z.boolean(),
  downloaded: z.boolean(),
  progress: z.number().nullable(),
  version: z.string().nullable(),
  error: z.string().nullable()
})

const CheckSchema = z.object({
  available: z.boolean(),
  version: z.string().nullable(),
  releaseNotes: z.string().nullable(),
  reason: z.string().optional()
})

const EventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('checking') }),
  z.object({
    type: z.literal('available'),
    version: z.string(),
    releaseNotes: z.string().nullable()
  }),
  z.object({ type: z.literal('not-available'), version: z.string() }),
  z.object({ type: z.literal('progress'), percent: z.number() }),
  z.object({ type: z.literal('downloaded'), version: z.string() }),
  z.object({ type: z.literal('error'), message: z.string() })
])

export const updaterSpecs = {
  [CHANNELS.UPDATER.READ]: { in: z.void(), out: StatusSchema },
  [CHANNELS.UPDATER.CHECK]: { in: z.void(), out: CheckSchema },
  [CHANNELS.UPDATER.DOWNLOAD]: { in: z.void(), out: z.void() },
  [CHANNELS.UPDATER.INSTALL]: { in: z.void(), out: z.void() }
} as const satisfies Record<
  Exclude<ChannelOfDomain<'updater'>, typeof CHANNELS.UPDATER.EVENT>,
  ChannelSpec
>

export const updaterPushSpec = {
  [CHANNELS.UPDATER.EVENT]: { out: EventSchema }
} as const

export { StatusSchema, CheckSchema, EventSchema }
