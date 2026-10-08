import { z } from 'zod'

import { CHANNELS } from '@/shared/ipc/channels'
import type { ChannelOfDomain } from '@/shared/ipc/channels'
import type { ChannelSpec } from '@/shared/ipc/spec'

const UpdateSchema = z.object({
  visible: z.boolean()
})

export const devtoolsSpecs = {
  [CHANNELS.DEVTOOLS.UPDATE]: { in: UpdateSchema, out: z.void() }
} as const satisfies Record<ChannelOfDomain<'devtools'>, ChannelSpec>

export { UpdateSchema }
