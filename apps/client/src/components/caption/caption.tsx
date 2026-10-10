import { Icon } from '@iconify/react/offline'
import { Button } from '@i-thinking/design/components/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@i-thinking/design/components/tooltip'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { cn } from 'cn'
import { useEffect, useState, type ReactNode } from 'react'

/**
 * 通用标题栏（窗口装饰）。
 *
 * 所有窗口都 `decorations: false`，桌面壳由本组件自绘：左侧 `start` 槽、
 * 右侧 `actions` 槽 + 原生窗口键。新增一个窗口键只需往 `WINDOW_CONTROLS` 加一条，
 * 布局、拖拽区与状态订阅都不用动。
 *
 * 拖拽区：槽位容器带 `data-region="true"`（CSS `-webkit-app-region: drag`，WebView2 生效）
 * 与 `data-tauri-drag-region`（Tauri 自带处理）；槽位里的交互元素必须带 `data-region="false"`，
 * 否则拖拽区会吃掉点击（窗口键已按此处理）。
 */

type AppWindow = ReturnType<typeof getCurrentWindow>

type WindowControlKey = 'minimize' | 'maximize' | 'close'

interface WindowControl {
  key: WindowControlKey
  findLabel: (isMaximized: boolean) => string
  findIcon: (isMaximized: boolean) => string
  /** 危险动作：hover 用 destructive 配色（关闭） */
  isDestructive?: boolean
  run: (win: AppWindow) => Promise<void>
}

/** 窗口键表：顺序即渲染顺序 */
const WINDOW_CONTROLS: readonly WindowControl[] = [
  {
    key: 'minimize',
    findLabel: function () {
      return '最小化'
    },
    findIcon: function () {
      return 'lucide:minus'
    },
    async run(win) {
      await win.minimize()
    }
  },
  {
    key: 'maximize',
    findLabel: function (isMaximized) {
      return isMaximized ? '还原' : '最大化'
    },
    findIcon: function (isMaximized) {
      return isMaximized ? 'lucide:copy' : 'lucide:square'
    },
    async run(win) {
      await win.toggleMaximize()
    }
  },
  {
    key: 'close',
    findLabel: function () {
      return '关闭'
    },
    findIcon: function () {
      return 'lucide:x'
    },
    isDestructive: true,
    async run(win) {
      await win.close()
    }
  }
]

/** 订阅当前窗口的最大化状态（窗口键图标与提示随态变化） */
function useWindowMaximized() {
  const [isMaximized, updateMaximized] = useState(false)

  useEffect(function () {
    const win = getCurrentWindow()
    let isActive = true
    let unlisten: (() => void) | undefined

    function sync() {
      void win
        .isMaximized()
        .then(function (value) {
          if (isActive) updateMaximized(value)
        })
        .catch(function (error: unknown) {
          console.warn('[caption] 读不到窗口最大化状态', error)
        })
    }

    sync()
    void win.onResized(sync).then(function (fn) {
      if (isActive) unlisten = fn
      else fn()
    })

    return function () {
      isActive = false
      unlisten?.()
    }
  }, [])

  return isMaximized
}

interface ControlButtonProps {
  control: WindowControl
  isMaximized: boolean
}

function ControlButton(props: ControlButtonProps) {
  const label = props.control.findLabel(props.isMaximized)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            data-region="false"
            aria-label={label}
            className={cn(
              'rounded-md text-muted-foreground',
              props.control.isDestructive &&
                'hover:bg-destructive active:bg-destructive hover:text-white'
            )}
            onClick={function () {
              void props.control.run(getCurrentWindow())
            }}
          />
        }>
        <Icon
          icon={props.control.findIcon(props.isMaximized)}
          aria-hidden
        />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

interface CaptionProps {
  className?: string
  /** 左侧主区域：标题、筛选、视图切换等 */
  start?: ReactNode
  /** 右侧扩展操作，渲染在窗口控制键左侧 */
  actions?: ReactNode
  /** 窗口键开关：true 全开（默认），对象形式可单独关掉某个键 */
  controls?: boolean | Partial<Record<WindowControlKey, boolean>>
  /** 整条作为拖拽区；窗口自带装饰时传 false */
  isDraggable?: boolean
}

function Caption(props: CaptionProps) {
  const isMaximized = useWindowMaximized()
  const isDraggable = props.isDraggable ?? true
  const flags = typeof props.controls === 'object' ? props.controls : null
  const controls =
    props.controls === false
      ? []
      : WINDOW_CONTROLS.filter(function (control) {
          return flags?.[control.key] !== false
        })

  return (
    <div
      data-region={isDraggable ? 'true' : 'false'}
      {...(isDraggable ? { 'data-tauri-drag-region': true } : {})}
      className={cn('flex min-h-8 w-full shrink-0 items-center gap-2 select-none', props.className)}>
      <div
        {...(isDraggable ? { 'data-tauri-drag-region': true } : {})}
        className="flex min-w-0 flex-1 items-center gap-2">
        {props.start}
      </div>
      <div
        data-region="false"
        className="ml-auto flex shrink-0 items-center gap-1">
        {props.actions}
        {controls.map(function (control) {
          return (
            <ControlButton
              key={control.key}
              control={control}
              isMaximized={isMaximized}
            />
          )
        })}
      </div>
    </div>
  )
}

export { Caption, WINDOW_CONTROLS }
export type { CaptionProps, WindowControl, WindowControlKey }
