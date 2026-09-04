import { z } from 'zod'
import Store from 'electron-store'

import type { Context } from './context'
import { registerHandler } from './handle'
import type { Plugin } from './module'
import { CHANNELS } from './channels'

interface ReadP {
  key: string
}

type ReadR = unknown

interface WriteP {
  key: string
  value: unknown
}

type WriteR = void

interface RemoveP {
  key: string
}

type RemoveR = void

interface HasP extends ReadP {}

type HasR = boolean

const ReadSchema = z.object({
  key: z.string().min(1)
})

const WriteSchema = z.object({
  key: z.string().min(1),
  value: z.unknown()
})

const HasSchema = ReadSchema
const RemoveSchema = ReadSchema

class Service {
  private readonly store = new Store()

  toRead(key: string): unknown {
    return this.store.get(key) ?? null
  }

  toWrite(key: string, value: unknown): void {
    this.store.set(key, value)
  }

  has(key: string): boolean {
    return this.store.has(key)
  }

  toRemove(key: string): void {
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
      registerHandler(ctx, CHANNELS.STORE.HAS, HasSchema, function (input) {
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
export { ReadSchema, WriteSchema, HasSchema, RemoveSchema, Service, buildPlugin }
