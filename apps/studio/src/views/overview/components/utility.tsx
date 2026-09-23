import { Utility, UtilityButton } from '@/components/utility'
import { DevtoolsAction, OverlayAction, ReloadAction } from '@/features/window/actions'
import { toast } from 'sonner'

interface OverviewUtilityProps {
  /** 暂时的登录入口，弹窗状态仍由概览页持有 */
  onOpenSignIn: () => void
}

/** 主窗口标题栏：Agent 入口 + 主窗口用得到的宿主动作 */
export default function OverviewUtility(props: OverviewUtilityProps) {
  async function handleOpenAgent() {
    try {
      await itc.window.toOpen({ key: 'agent' })
    } catch (error) {
      toast.error('Agent 窗口打开失败', { duration: 2000 })
      console.error(error)
    }
  }

  return (
    <Utility>
      <UtilityButton
        icon="mdi:login"
        label="登录"
        onClick={props.onOpenSignIn}
      />
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
