import { z } from 'zod'

import { CHANNELS } from '../channels'
import type { ChannelOfDomain } from '../channels'
import type { ChannelSpec } from '../spec'

/** 合法 URL，或空字符串 / null 表示未设置 */
const NullableUrl = z.union([z.string().url(), z.literal('')]).nullish()

const ProviderReadSchema = z.object({
  id: z.string(),
  kind: z.string(),
  name: z.string(),
  baseUrl: z.string().nullable(),
  models: z.array(z.string()).nullable(),
  model: z.string().nullable(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
})

const ProviderWriteSchema = z.object({
  kind: z.string().min(1),
  name: z.string().min(1),
  baseUrl: NullableUrl,
  models: z.array(z.string()).nullish(),
  model: z.string().nullish(),
  enabled: z.boolean().optional()
})

const ProviderUpdateSchema = ProviderWriteSchema.partial().extend({
  id: z.uuid()
})

const SessionReadSchema = z.object({
  id: z.string(),
  title: z.string(),
  pinned: z.boolean(),
  providerID: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
})

const SessionWriteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  providerID: z.uuid().nullish()
})

const SessionUpdateSchema = SessionWriteSchema.extend({
  id: z.uuid(),
  pinned: z.boolean().optional()
})

const MessageReadSchema = z.object({
  sessionID: z.uuid()
})

const MessageResultSchema = z.object({
  id: z.string(),
  sessionID: z.string(),
  parentID: z.string().nullable(),
  format: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
})

const MessageAppendSchema = z.object({
  id: z.uuid().optional(),
  sessionID: z.uuid(),
  parentID: z.uuid().nullish(),
  format: z.string().min(1),
  content: z.string()
})

const MessageUpdateSchema = z.object({
  id: z.uuid(),
  format: z.string().min(1).optional(),
  content: z.string().optional()
})

const RemoveSchema = z.object({
  id: z.uuid()
})

export const chatSpecs = {
  [CHANNELS.CHAT.PROVIDER.READ]: { in: z.void(), out: z.array(ProviderReadSchema) },
  [CHANNELS.CHAT.PROVIDER.WRITE]: { in: ProviderWriteSchema, out: ProviderReadSchema },
  [CHANNELS.CHAT.PROVIDER.UPDATE]: { in: ProviderUpdateSchema, out: ProviderReadSchema },
  [CHANNELS.CHAT.PROVIDER.REMOVE]: { in: RemoveSchema, out: z.void() },

  [CHANNELS.CHAT.SESSION.READ]: { in: z.void(), out: z.array(SessionReadSchema) },
  [CHANNELS.CHAT.SESSION.WRITE]: { in: SessionWriteSchema, out: SessionReadSchema },
  [CHANNELS.CHAT.SESSION.UPDATE]: { in: SessionUpdateSchema, out: SessionReadSchema },
  [CHANNELS.CHAT.SESSION.REMOVE]: { in: RemoveSchema, out: z.void() },

  [CHANNELS.CHAT.MESSAGE.READ]: { in: MessageReadSchema, out: z.array(MessageResultSchema) },
  [CHANNELS.CHAT.MESSAGE.APPEND]: { in: MessageAppendSchema, out: MessageResultSchema },
  [CHANNELS.CHAT.MESSAGE.UPDATE]: { in: MessageUpdateSchema, out: MessageResultSchema },
  [CHANNELS.CHAT.MESSAGE.REMOVE]: { in: RemoveSchema, out: z.void() }
} as const satisfies Record<ChannelOfDomain<'chat'>, ChannelSpec>

export {
  ProviderWriteSchema,
  ProviderUpdateSchema,
  SessionWriteSchema,
  SessionUpdateSchema,
  MessageReadSchema,
  MessageAppendSchema,
  MessageUpdateSchema,
  RemoveSchema
}
