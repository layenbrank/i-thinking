import path from 'node:path'

import { REPO_ROOT } from '../../../core/paths.ts'

import type { StageTarget } from '../infra/stage.ts'

const StudioTarget: StageTarget = {
  id: 'studio',
  findStagedDir(platformKey) {
    return path.join(REPO_ROOT, 'apps', 'studio', 'sidecar', 'staging', platformKey)
  }
}

export { StudioTarget }
