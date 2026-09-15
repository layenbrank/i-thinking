import type { Context } from './context'

interface Plugin {
  name: string
  register: (ctx: Context) => void | Promise<void>
  dispose?: () => void | Promise<void>
}

export type { Plugin }
