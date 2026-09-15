import { z } from 'zod'

import { CHANNELS } from '../channels'
import type { ChannelOfDomain } from '../channels'
import type { ChannelSpec } from '../spec'

const UpdateSchema = z.object({
  visible: z.boolean()
})

export const devtoolsSpecs = {
  [CHANNELS.DEVTOOLS.UPDATE]: { in: UpdateSchema, out: z.void() }
} as const satisfies Record<ChannelOfDomain<'devtools'>, ChannelSpec>

export { UpdateSchema }
