import { CHANNELS } from '../../../shared/ipc/channels'
import { type AgentWindowPort } from '../../capabilities/agent-window'
import { type DomainHandlers } from '../types'

/** window 域只有「开 Agent 窗口」：创建/聚焦归端口，频道只做触发 */
export function buildWindowHandlers(agentWindow: AgentWindowPort): DomainHandlers<'window'> {
  return {
    [CHANNELS.WINDOW.AGENT.OPEN]: function () {
      agentWindow.toOpen()
    }
  }
}
