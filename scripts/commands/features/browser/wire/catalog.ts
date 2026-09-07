import type { WireStep } from '../types.ts'
import { AppsShortcutStep } from './apps-shortcut.ts'
import { BrandingStep } from './branding.ts'
import { ChromePaksStep } from './chrome-paks.ts'
import { NewTabPageStep } from './new-tab.ts'
import { AppsShortcutPrefStep } from './prefs.ts'
import { ResourceIdsStep } from './resource-ids.ts'
import { ResourcesBuildStep } from './resources-build.ts'
import { WebuiConfigsStep } from './webui-configs.ts'

/** 有序接线步骤：新增步骤实现文件后在此登记。 */
const WIRE_STEPS: readonly WireStep[] = [
  WebuiConfigsStep,
  ResourcesBuildStep,
  ChromePaksStep,
  ResourceIdsStep,
  AppsShortcutStep,
  NewTabPageStep,
  BrandingStep,
  AppsShortcutPrefStep
]

function runWireSteps(ctx: Parameters<WireStep['apply']>[0]): void {
  for (const step of WIRE_STEPS) {
    step.apply(ctx)
  }
}

export { WIRE_STEPS, runWireSteps }
