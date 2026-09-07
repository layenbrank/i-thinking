import { ApplyAction } from './actions/apply.ts'
import { BootstrapAction } from './actions/bootstrap.ts'
import { BuildAction } from './actions/build.ts'
import { ConfigureAction } from './actions/configure.ts'
import { ExportPatchesAction } from './actions/export-patches.ts'
import { FetchAction } from './actions/fetch.ts'
import { MigrateAction } from './actions/migrate.ts'
import { PackAction } from './actions/pack.ts'
import { StageAction } from './actions/stage.ts'
import { StatusAction } from './actions/status.ts'
import { SyncAction } from './actions/sync.ts'
import type { BrowserAction } from './types.ts'

/**
 * 按首次 / 日常流水线顺序登记。
 * Object.values 保持插入序；help 与此一致。
 */
const ACTIONS: Record<string, BrowserAction> = {
  status: StatusAction,
  bootstrap: BootstrapAction,
  migrate: MigrateAction,
  fetch: FetchAction,
  sync: SyncAction,
  apply: ApplyAction,
  configure: ConfigureAction,
  build: BuildAction,
  stage: StageAction,
  pack: PackAction,
  'export-patches': ExportPatchesAction
}

export { ACTIONS }
