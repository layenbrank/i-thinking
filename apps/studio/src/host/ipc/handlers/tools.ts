import { type WebContents } from 'electron'

import { CHANNELS } from '@/shared/ipc/channels'
import { Service, type ToolProgress } from '@/host/capabilities/tools/service'
import { type DomainHandlers } from '@/host/ipc/types'

/**
 * 在线工具：状态、下载、卸载。进度推回**发起这次请求的窗口** ——
 * 设置页可能在独立窗口里打开，推给主窗口等于没人收。
 */
function toProgress(sender: WebContents): (progress: ToolProgress) => void {
  return function (progress) {
    if (!sender.isDestroyed()) {
      sender.send(CHANNELS.TOOL.PROGRESS, progress)
    }
  }
}

export function buildToolHandlers(): DomainHandlers<'tool'> {
  const service = new Service()

  return {
    [CHANNELS.TOOL.READ]: function () {
      return service.findStatuses()
    },
    [CHANNELS.TOOL.INSTALL]: function (input, event) {
      return service.install(input.key, toProgress(event.sender))
    },
    [CHANNELS.TOOL.REMOVE]: function (input) {
      service.remove(input.key)
    }
  }
}
