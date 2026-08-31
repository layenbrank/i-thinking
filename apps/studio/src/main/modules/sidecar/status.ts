import type { CorexHost } from './host'
import { COREX_DAEMON, PANDOC_BINARY } from './constants'
import { hasBinary } from './paths'
import type { FindStatusR } from '@shared/ipc/sidecar'

function findStatus(corex: CorexHost): FindStatusR {
  return {
    isReady: corex.isRunning(),
    version: corex.findVersion(),
    actions: [...corex.findActions()],
    hasCorex: hasBinary(COREX_DAEMON),
    hasPandoc: hasBinary(PANDOC_BINARY)
  }
}

export { findStatus }
