import type { Context } from './context'

export interface StudioModule {
  name: string
  register: (ctx: Context) => void | Promise<void>
  dispose?: () => void | Promise<void>
}
