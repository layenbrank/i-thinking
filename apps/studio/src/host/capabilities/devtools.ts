import type { CHANNELS } from '../../shared/ipc/channels'
import { type In, type Out } from '../../shared/ipc/specs'

type UpdateP = In<typeof CHANNELS.DEVTOOLS.UPDATE>
type UpdateR = Out<typeof CHANNELS.DEVTOOLS.UPDATE>

export type { UpdateP, UpdateR }
// 临时 re-export：specs 批次收尾时移除
export { UpdateSchema } from '../../shared/ipc/specs/devtools'
