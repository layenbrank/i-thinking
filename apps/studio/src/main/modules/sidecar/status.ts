import type { CorexHost } from './host'
import { COREX_DAEMON, PANDOC_BINARY } from './constants'
import { hasBinary } from './paths'
import type { SidecarStatus } from './schemas'

function findStatus(corex: CorexHost): SidecarStatus {
  return {
    isReady: corex.isRunning(),
    version: corex.findVersion(),
    modules: [...corex.findActions()],
    hasCorex: hasBinary(COREX_DAEMON),
    hasPandoc: hasBinary(PANDOC_BINARY)
  }
}

export { findStatus }
