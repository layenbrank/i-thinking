import type { AppContext } from './app-context'

export interface StudioModule {
  name: string
  register: (ctx: AppContext) => void | Promise<void>
  dispose?: () => void | Promise<void>
}
