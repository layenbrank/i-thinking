import { z } from 'zod'

import { CHANNELS } from '../channels'
import type { ChannelOfDomain } from '../channels'
import type { ChannelSpec } from '../spec'

const StatusSchema = z.object({
  isReady: z.boolean(),
  version: z.string(),
  actions: z.array(z.string()),
  hasCorex: z.boolean(),
  hasPandoc: z.boolean()
})

export const sidecarSpecs = {
  [CHANNELS.SIDECAR.READ]: { in: z.void(), out: StatusSchema }
} as const satisfies Record<ChannelOfDomain<'sidecar'>, ChannelSpec>

export { StatusSchema }
