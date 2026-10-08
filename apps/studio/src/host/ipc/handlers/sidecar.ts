import { type WebContents } from 'electron'

import { findStatus, type CorexHost, type CorexStepProgress } from '@/host/capabilities/sidecar'
import { type DomainHandlers } from '@/host/ipc/types'
import { CHANNELS } from '@/shared/ipc/channels'
import type { Out } from '@/shared/ipc/specs'

/**
 * 把 corex 进度帧推回**发起这次请求的窗口**（进度是主动推，不是任何请求的回话）。
 * 指令编辑器跑在独立窗口里，推给主窗口等于没人收。
 *
 * 贴上 `runId`：渲染侧同一窗口可以并发多次运行，帧不带编号就分不清属于哪一次。
 */
function toProgress(sender: WebContents, runId: string) {
  return function (progress: CorexStepProgress) {
    if (!sender.isDestroyed()) {
      sender.send(CHANNELS.SIDECAR.PROGRESS, { ...progress, runId })
    }
  }
}

export function buildSidecarHandlers(sidecar: CorexHost): DomainHandlers<'sidecar'> {
  return {
    [CHANNELS.SIDECAR.READ]: function () {
      return findStatus(sidecar)
    },
    [CHANNELS.SIDECAR.ACTIONS]: function () {
      return sidecar.findCatalog() as Out<typeof CHANNELS.SIDECAR.ACTIONS>
    },
    [CHANNELS.SIDECAR.DIRECTIVES]: function () {
      return sidecar.fetchDirectives()
    },
    [CHANNELS.SIDECAR.DIRECTIVE]: async function (input) {
      return (await sidecar.readDirective(input.name)) as Out<typeof CHANNELS.SIDECAR.DIRECTIVE>
    },
    [CHANNELS.SIDECAR.SAVE]: function (input) {
      return sidecar.saveDirective(input.definition, input.original_name)
    },
    [CHANNELS.SIDECAR.DELETE]: function (input) {
      return sidecar.deleteDirective(input.name)
    },
    [CHANNELS.SIDECAR.IMPORT]: function (input) {
      return sidecar.importDirectives(input)
    },
    [CHANNELS.SIDECAR.EDIT]: function (input) {
      return sidecar.editDirective(input.name)
    },
    [CHANNELS.SIDECAR.INVOKE]: function (input, event) {
      return sidecar.invokeAction(
        input.action,
        input.params ?? {},
        toProgress(event.sender, input.runId)
      )
    },
    [CHANNELS.SIDECAR.RUN]: function (input, event) {
      return sidecar.runDirective(
        input.name,
        input.input ?? {},
        toProgress(event.sender, input.runId)
      )
    },
    [CHANNELS.SIDECAR.JOBS]: async function (input) {
      return { jobs: await sidecar.fetchJobs(input.kind) }
    },
    [CHANNELS.SIDECAR.START_JOB]: function (input) {
      return sidecar.startJob(input.kind, input.name, { immediate: input.immediate })
    },
    [CHANNELS.SIDECAR.STOP_JOB]: function (input) {
      return sidecar.stopJob(input.kind, input.name, { force: input.force })
    }
  }
}
