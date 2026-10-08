import path from 'node:path'

import { REPO_ROOT } from '../../../core/paths.ts'

import type { StageTarget } from '../infra/stage.ts'

const StudioTarget: StageTarget = {
  id: 'studio',
  // studio 的 agent 走 opencode，goose 是 client 的 ACP 侧车：不随 studio 落盘（256 MB）
  tools: ['corex', 'ffmpeg', 'opencode', 'pandoc'],
  findStagedDir(platformKey) {
    return path.join(REPO_ROOT, 'apps', 'studio', 'sidecar', 'staging', platformKey)
  }
}

export { StudioTarget }
