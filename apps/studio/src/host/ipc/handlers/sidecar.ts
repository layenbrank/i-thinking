import { type WebContents } from 'electron'

import { CHANNELS } from '../../../shared/ipc/channels'
import type { Out } from '../../../shared/ipc/specs'
import { findStatus, type CorexStepProgress } from '../../capabilities/sidecar'
import { type Context } from '../../framework/context'
import { type DomainHandlers } from '../types'

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

export function buildSidecarHandlers(ctx: Context): DomainHandlers<'sidecar'> {
  return {
    [CHANNELS.SIDECAR.READ]: function () {
      return findStatus(ctx.corex)
    },
    [CHANNELS.SIDECAR.ACTIONS]: function () {
      return ctx.corex.findCatalog() as Out<typeof CHANNELS.SIDECAR.ACTIONS>
    },
    [CHANNELS.SIDECAR.DIRECTIVES]: function (input) {
      return ctx.corex.listDirectives(input?.dir)
    },
    [CHANNELS.SIDECAR.DIRECTIVE]: async function (input) {
      return (await ctx.corex.readDirective(input.name)) as Out<typeof CHANNELS.SIDECAR.DIRECTIVE>
    },
    [CHANNELS.SIDECAR.SAVE]: function (input) {
      return ctx.corex.saveDirective(input)
    },
    [CHANNELS.SIDECAR.INVOKE]: function (input, event) {
      return ctx.corex.invokeAction(
        input.action,
        input.params ?? {},
        toProgress(event.sender, input.runId)
      )
    },
    [CHANNELS.SIDECAR.RUN]: function (input, event) {
      return ctx.corex.runDirective(
        input.name,
        input.input ?? {},
        toProgress(event.sender, input.runId)
      )
    }
  }
}
