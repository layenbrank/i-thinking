import type { CHANNELS } from '../../shared/ipc/channels'
import { type In, type Out } from '../../shared/ipc/specs'

type ReadR = Out<typeof CHANNELS.OVERLAY.READ>
type UpdateP = In<typeof CHANNELS.OVERLAY.UPDATE>

export type { ReadR, UpdateP }
// 临时 re-export：window.ts 从本模块取 schema，specs 批次收尾时移除
export { UpdateSchema } from '../../shared/ipc/specs/overlay'
