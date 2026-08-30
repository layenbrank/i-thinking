import { ClientTarget } from './client.ts'
import { StudioTarget } from './studio.ts'

import type { StageTarget } from '../infra/stage.ts'

const TARGETS: Record<string, StageTarget> = {
  studio: StudioTarget,
  client: ClientTarget
}

function findTarget(id: string): StageTarget {
  const target = TARGETS[id]
  if (!target) {
    throw new Error(`[sidecar] 未知应用目标: ${id}（${Object.keys(TARGETS).join('|')}）`)
  }
  return target
}

function targetKeys(): string[] {
  return Object.keys(TARGETS)
}

export { TARGETS, findTarget, targetKeys }
