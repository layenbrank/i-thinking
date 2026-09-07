import type { CommandModule } from '../../core/registry.ts'
import { createContext } from './infra/config.ts'
import { ensureDepotEnv } from './infra/env.ts'
import { ACTIONS } from './catalog.ts'

const BrowserCommand: CommandModule = {
  name: 'browser',
  description: 'i-thinking Chromium fork：从工具链到安装包',
  register(program) {
    const ctx = createContext()
    ensureDepotEnv(ctx)

    const browser = program
      .command('browser')
      .description('i-thinking Chromium fork（按步骤：检查 → 工具链 → 源码 → WebUI → 接线 → 编译 → 打包）')
      .addHelpText(
        'after',
        `
推荐顺序（首次）:
  pnpm browser status
  pnpm browser bootstrap
  pnpm browser fetch
  pnpm --filter @i-thinking/browser build
  pnpm browser sync
  pnpm browser apply
  pnpm browser configure            # 发布加 --release
  pnpm browser build
  pnpm browser stage
  pnpm browser pack

日常只改 WebUI:
  pnpm --filter @i-thinking/browser build
  pnpm browser sync && pnpm browser apply && pnpm browser build

扩展:
  - 新步骤 → actions/*.ts + catalog.ts（按流水线插入顺序）
  - 新接线 → wire/*.ts + wire/catalog.ts
  - 新构建档 → profiles + profiles/catalog.ts
`
      )

    for (const action of Object.values(ACTIONS)) {
      action.register(browser, ctx)
    }
  }
}

export { BrowserCommand }
