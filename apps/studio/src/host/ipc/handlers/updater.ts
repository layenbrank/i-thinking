import { CHANNELS } from '@/shared/ipc/channels'
import { Service } from '@/host/capabilities/updater'
import { type MainWindowPort } from '@/host/capabilities/window'
import { type Context } from '@/host/framework/context'
import { type DomainHandlers } from '@/host/ipc/types'

/** 更新事件推给主窗口 —— 宿主从主窗口端口取，与托盘/二次启动同一来源 */
export function buildUpdaterHandlers(
  ctx: Context,
  mainWindow: MainWindowPort
): DomainHandlers<'updater'> {
  const service = new Service(ctx, function () {
    return mainWindow.toRead()
  })
  // 必须在任何 invoke 之前完成事件接线（与旧 buildPlugin 的顺序一致）
  service.configure()

  return {
    [CHANNELS.UPDATER.READ]: function () {
      return service.toRead()
    },
    [CHANNELS.UPDATER.CHECK]: function () {
      return service.check()
    },
    [CHANNELS.UPDATER.DOWNLOAD]: async function () {
      await service.download()
    },
    [CHANNELS.UPDATER.INSTALL]: function () {
      service.install()
    }
  }
}
