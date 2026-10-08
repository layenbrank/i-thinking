import { z } from 'zod'

import { CHANNELS } from '@/shared/ipc/channels'
import type { ChannelOfDomain } from '@/shared/ipc/channels'
import type { ChannelSpec } from '@/shared/ipc/spec'

/** IPC 二进制：主进程 Buffer / 渲染进程 Uint8Array 都认 */
const BytesSchema = z.custom<Uint8Array>(
  function (value) {
    return value instanceof Uint8Array
  },
  { message: 'expected Uint8Array' }
)

const ShotSchema = z.object({
  path: z.string(),
  width: z.number(),
  height: z.number(),
  /** PNG 原始字节；渲染侧立刻转 Blob URL 后应丢弃 */
  bytes: BytesSchema
})

export const captureSpecs = {
  [CHANNELS.CAPTURE.SCREENSHOT]: { in: z.void(), out: ShotSchema },
  [CHANNELS.CAPTURE.OPEN]: { in: z.void(), out: ShotSchema },
  [CHANNELS.CAPTURE.CLOSE]: { in: z.void(), out: z.void() },
  [CHANNELS.CAPTURE.RECORDER]: { in: z.void(), out: z.void() }
} as const satisfies Record<ChannelOfDomain<'capture'>, ChannelSpec>

export { BytesSchema, ShotSchema }
