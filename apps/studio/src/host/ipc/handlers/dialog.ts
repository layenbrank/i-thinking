import { CHANNELS } from '../../../shared/ipc/channels'
import { Service } from '../../capabilities/dialog'
import { type MainWindowPort } from '../../capabilities/window'
import { type DomainHandlers } from '../types'

/** 系统对话框以主窗口为 parent（父窗口缺失时 Electron 退化为无父模态） */
export function buildDialogHandlers(mainWindow: MainWindowPort): DomainHandlers<'dialog'> {
  const service = new Service(function () {
    return mainWindow.toRead()
  })

  return {
    [CHANNELS.DIALOG.OPEN]: function (input) {
      return service.open(input)
    },
    [CHANNELS.DIALOG.SAVE]: function (input) {
      return service.save(input)
    }
  }
}
