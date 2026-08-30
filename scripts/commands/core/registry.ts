import type { Command } from 'commander'

interface CommandModule {
  name: string
  description: string
  register(program: Command): void
}

function registerModules(program: Command, modules: ReadonlyArray<CommandModule>): void {
  for (const mod of modules) {
    mod.register(program)
  }
}

export type { CommandModule }
export { registerModules }
