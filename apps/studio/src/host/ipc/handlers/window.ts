import { CHANNELS } from '../../../shared/ipc/channels'
import { type WindowPorts } from '../../capabilities/window-registry'
import { type DomainHandlers } from '../types'

/**
 * window 域只有「开窗口」：创建/聚焦归端口，频道只做触发。
 * 键到端口的映射就是注册表本身 —— 没有分支，也没有第二份窗口清单。
 */
export function buildWindowHandlers(windows: WindowPorts): DomainHandlers<'window'> {
  return {
    [CHANNELS.WINDOW.OPEN]: function ({ key }) {
      windows[key].toOpen()
    }
  }
}
