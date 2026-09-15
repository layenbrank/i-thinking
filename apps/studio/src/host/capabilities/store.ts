import Store from 'electron-store'

import type { CHANNELS } from '../../shared/ipc/channels'
import { type In, type Out } from '../../shared/ipc/specs'

type ReadP = In<typeof CHANNELS.STORE.READ>
type ReadR = Out<typeof CHANNELS.STORE.READ>
type WriteP = In<typeof CHANNELS.STORE.WRITE>
type WriteR = Out<typeof CHANNELS.STORE.WRITE>
type RemoveP = In<typeof CHANNELS.STORE.REMOVE>
type RemoveR = Out<typeof CHANNELS.STORE.REMOVE>
type HasP = In<typeof CHANNELS.STORE.HAS>
type HasR = Out<typeof CHANNELS.STORE.HAS>

class Service {
  private readonly store = new Store()

  toRead(key: string): ReadR {
    return this.store.get(key) ?? null
  }

  toWrite(key: string, value: unknown): WriteR {
    this.store.set(key, value)
  }

  has(key: string): HasR {
    return this.store.has(key)
  }

  toRemove(key: string): RemoveR {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  keys(): string[] {
    return Object.keys(this.store.store)
  }
}

export type { ReadP, ReadR, WriteP, WriteR, RemoveP, RemoveR, HasP, HasR }
export { Service }
// 临时 re-export：让既有测试与消费方不动，specs 批次收尾时移除
export {
  ReadSchema,
  WriteSchema,
  HasSchema,
  RemoveSchema
} from '../../shared/ipc/specs/store'
