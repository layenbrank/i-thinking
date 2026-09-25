import { z } from 'zod'

import { CHANNELS } from '../channels'
import type { ChannelOfDomain } from '../channels'
import type { ChannelSpec } from '../spec'

const KeyWriteSchema = z.object({
  providerID: z.uuid(),
  apiKey: z.string().min(1).max(4096)
})

const KeyRefSchema = z.object({
  providerID: z.uuid()
})

/**
 * `assistant:connect` 之后的端口推送：`MessagePort` 由 Electron 代理传递，不参与校验，
 * 这里只为渲染侧提供类型。注意这是**全局类型引用**而非 import，
 * 不破坏 src/shared 的框架无关约束。
 */
const PortSchema = z.custom<MessagePort>()

export const assistantSpecs = {
  [CHANNELS.ASSISTANT.CONNECT]: { in: z.void(), out: z.void() },
  [CHANNELS.ASSISTANT.KEY.WRITE]: { in: KeyWriteSchema, out: z.void() },
  [CHANNELS.ASSISTANT.KEY.HAS]: { in: KeyRefSchema, out: z.boolean() },
  [CHANNELS.ASSISTANT.KEY.REMOVE]: { in: KeyRefSchema, out: z.void() }
} as const satisfies Record<
  Exclude<ChannelOfDomain<'assistant'>, typeof CHANNELS.ASSISTANT.PORT>,
  ChannelSpec
>

export const assistantPushSpec = {
  [CHANNELS.ASSISTANT.PORT]: { out: PortSchema }
} as const

export { KeyWriteSchema, KeyRefSchema, PortSchema }
