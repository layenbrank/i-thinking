import { z } from 'zod'

import { CHANNELS } from '../channels'
import type { ChannelOfDomain } from '../channels'
import type { ChannelSpec } from '../spec'

/** 合法邮箱，或空字符串表示清空 */
const OptionalEmail = z.union([z.string().email(), z.literal('')]).optional()

const WriteSchema = z.object({
  name: z.string().optional(),
  email: OptionalEmail
})

const UpdateSchema = z.object({
  id: z.uuid(),
  name: z.string().optional(),
  email: OptionalEmail
})

const RemoveSchema = z.object({
  id: z.uuid()
})

const RecordSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable()
})

export const userSpecs = {
  [CHANNELS.USER.READ]: { in: z.void(), out: z.array(RecordSchema) },
  [CHANNELS.USER.WRITE]: { in: WriteSchema, out: RecordSchema },
  [CHANNELS.USER.UPDATE]: { in: UpdateSchema, out: RecordSchema },
  [CHANNELS.USER.REMOVE]: { in: RemoveSchema, out: z.void() }
} as const satisfies Record<ChannelOfDomain<'user'>, ChannelSpec>

export { WriteSchema, UpdateSchema, RemoveSchema, RecordSchema }
