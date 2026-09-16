import { Utility } from '@/components/utility'
import { DevtoolsAction, ReloadAction } from '@/features/window/actions'

/** Agent 窗口标题栏：只有本窗口用得到的宿主动作（浮层开关归主窗口） */
export default function AgentUtility() {
  return (
    <Utility>
      <DevtoolsAction />
      <ReloadAction />
    </Utility>
  )
}
