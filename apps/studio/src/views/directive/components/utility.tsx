import { Utility, UtilityButton } from '@/components/utility'
import { DevtoolsAction, ReloadAction } from '@/features/window/actions'

interface Props {
  onOpenLibrary: () => void
  /** 编排台才需要「回卡片墙」；卡片墙自己没有上一级，不传就不显示 */
  onBack?: () => void
}

/** 指令窗口标题栏：只有本窗口用得到的宿主动作 */
export default function DirectiveUtility(props: Props) {
  return (
    <Utility>
      {props.onBack ? (
        <UtilityButton
          icon="mdi:arrow-left"
          label="返回指令列表"
          onClick={props.onBack}
        />
      ) : null}
      <UtilityButton
        icon="mdi:view-grid-outline"
        label="动作库"
        onClick={props.onOpenLibrary}
      />
      <DevtoolsAction />
      <ReloadAction />
    </Utility>
  )
}
