import Store from 'electron-store'

import type { Context } from '../framework/context'
import { registerHandler } from '../framework/handle'
import type { Plugin } from '../framework/module'
import { CHANNELS } from '../../shared/ipc/channels'
import { ReadSchema, RemoveSchema, WriteSchema } from '../../shared/ipc/specs/store'
import type { In, Out } from '../../shared/ipc/specs'

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

function buildPlugin(): Plugin {
  const service = new Service()
  return {
    name: 'store',
    register(ctx: Context) {
      registerHandler(ctx, CHANNELS.STORE.READ, ReadSchema, function (input) {
        return service.toRead(input.key)
      })
      registerHandler(ctx, CHANNELS.STORE.WRITE, WriteSchema, function (input) {
        service.toWrite(input.key, input.value)
      })
      registerHandler(ctx, CHANNELS.STORE.HAS, ReadSchema, function (input) {
        return service.has(input.key)
      })
      registerHandler(ctx, CHANNELS.STORE.REMOVE, RemoveSchema, function (input) {
        service.toRemove(input.key)
      })
      registerHandler(ctx, CHANNELS.STORE.CLEAR, null, function () {
        service.clear()
      })
      registerHandler(ctx, CHANNELS.STORE.KEYS, null, function () {
        return service.keys()
      })
      ctx.logger.child('store').info('registered')
    }
  }
}

export type { ReadP, ReadR, WriteP, WriteR, RemoveP, RemoveR, HasP, HasR }
export { Service, buildPlugin }
// 临时 re-export：让既有测试与消费方不动，specs 批次收尾时移除
export {
  ReadSchema,
  WriteSchema,
  HasSchema,
  RemoveSchema
} from '../../shared/ipc/specs/store'
