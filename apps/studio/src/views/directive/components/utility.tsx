import { Icon } from '@iconify/react/offline'
import { useEffect, useState } from 'react'

import { Utility, UtilityButton } from '@/components/utility'
import { DevtoolsAction, ReloadAction } from '@/features/window/actions'
import { useCorexStore } from '@/stores/corex'

interface Props {
  onOpenLibrary: () => void
  /** 编排台才需要「回卡片墙」；卡片墙自己没有上一级，不传就不显示 */
  onBack?: () => void
}

type SidecarStatus = Awaited<ReturnType<typeof itc.sidecar.toRead>>

/**
 * 指令库在哪。
 *
 * v13 起指令不是一摞 YAML 而是一个 SQLite 文件，「我改的到底是哪一份」对不上时全靠这一行来对账：
 * 文件路径 + corex 版本 + 这份 corex 是用户自己装的还是 Studio 自带的（自带的那份数据目录是私有的，
 * 跟用户 CLI 那棵树不是一回事）。
 */
function EngineStatus() {
  const [status, setStatus] = useState<SidecarStatus | null>(null)
  /** 目录读成功 = corex 已经起来了；以它为触发点，路径才不会是空的 */
  const isLoaded = useCorexStore(function (state) {
    return state.isLoaded
  })

  useEffect(
    function () {
      let alive = true
      void itc.sidecar
        .toRead()
        .then(function (next) {
          if (alive) setStatus(next)
        })
        .catch(function (error) {
          // 状态读不到不影响用：这一行只是排错用的注脚
          console.warn('[directive] 读 corex 状态失败', error)
        })
      return function () {
        alive = false
      }
    },
    [isLoaded]
  )

  if (!status) return null

  const origin = status.isBundled ? 'Studio 自带' : '用户安装'
  return (
    <span
      className="ml-3 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
      title={`指令库：${status.directivesDb || '未知'}\ncorex：${status.version || '版本未知'}（${origin}）\n数据目录：${status.dataDir}`}>
      <Icon
        icon="mdi:database-outline"
        className="shrink-0"
      />
      <span className="truncate">指令库：{status.directivesDb || '未就绪'}</span>
      <span className="shrink-0">
        · corex {status.version || '未知'}（{origin}）
      </span>
    </span>
  )
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
      <EngineStatus />
    </Utility>
  )
}
