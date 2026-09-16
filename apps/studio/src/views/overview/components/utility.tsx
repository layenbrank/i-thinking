import { Utility, UtilityButton } from '@/components/utility'
import { DevtoolsAction, OverlayAction, ReloadAction } from '@/features/window/actions'
import { toast } from 'sonner'

/** 主窗口标题栏：Agent 入口 + 主窗口用得到的宿主动作 */
export default function OverviewUtility() {
  async function handleOpenAgent() {
    try {
      await itc.window.agent.toOpen()
    } catch (error) {
      toast.error('Agent 窗口打开失败', { duration: 2000 })
      console.error(error)
    }
  }

  return (
    <Utility>
      <UtilityButton
        icon="mdi:chat-processing-outline"
        label="打开 Agent 窗口"
        onClick={handleOpenAgent}
      />
      <DevtoolsAction />
      <OverlayAction />
      <ReloadAction />
    </Utility>
  )
}
