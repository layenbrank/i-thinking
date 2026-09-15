import { z } from 'zod'

import { CHANNELS } from '../channels'
import type { ChannelOfDomain } from '../channels'
import type { ChannelSpec } from '../spec'

const ReadSchema = z.object({
  key: z.string().min(1)
})

const WriteSchema = z.object({
  key: z.string().min(1),
  value: z.unknown()
})

const HasSchema = ReadSchema
const RemoveSchema = ReadSchema

export const storeSpecs = {
  [CHANNELS.STORE.READ]: { in: ReadSchema, out: z.unknown() },
  [CHANNELS.STORE.WRITE]: { in: WriteSchema, out: z.void() },
  [CHANNELS.STORE.HAS]: { in: HasSchema, out: z.boolean() },
  [CHANNELS.STORE.REMOVE]: { in: RemoveSchema, out: z.void() },
  [CHANNELS.STORE.CLEAR]: { in: z.void(), out: z.void() },
  [CHANNELS.STORE.KEYS]: { in: z.void(), out: z.array(z.string()) }
} as const satisfies Record<ChannelOfDomain<'store'>, ChannelSpec>

export { ReadSchema, WriteSchema, HasSchema, RemoveSchema }
