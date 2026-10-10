import { cn } from 'cn'
import type { ReactNode } from 'react'

import { Caption, type CaptionProps } from '@/components/caption/caption'

/**
 * 无边框窗口的通用外壳（容器）：顶栏装饰（Caption）+ 内容区 + 可选底栏。
 *
 * 两种形态：
 * - `isFramed`（默认）：透明窗内层圆角卡片（磁贴窗）—— 卡片承担可见面，内容区不透明；
 * - `isFramed={false}`：不画卡片，内容区透明（原生 mica / 亚克力透出来），供主窗口这类
 *   自带窗口材质的场景用 —— 但容器职责不变：**它负责把内容撑满窗口并给出纵向 flex 列**，
 *   子元素不再各自 `height: 100vh`。
 */

interface WindowFrameProps {
  children: ReactNode
  className?: string
  /** 顶栏标题；`start` 优先，两者都没传则顶栏只有窗口键 */
  title?: string
  /** 顶栏左侧主区域 */
  start?: ReactNode
  /** 顶栏右侧扩展操作（在窗口键左侧） */
  actions?: ReactNode
  /** 窗口键开关；不传为全开 */
  controls?: CaptionProps['controls']
  /** 底栏操作区；不传则不渲染 */
  footer?: ReactNode
  /** 内容区是否由外壳统一滚动；内部已有滚动区时传 false */
  isScrollable?: boolean
  /** 透明窗口下渲染内层圆角卡片；窗口自带材质（mica 等）时传 false */
  isFramed?: boolean
}

function WindowFrame(props: WindowFrameProps) {
  const isScrollable = props.isScrollable ?? true
  const isFramed = props.isFramed ?? true
  const start =
    props.start ??
    (props.title ? <span className="truncate px-1 text-sm font-medium">{props.title}</span> : null)

  return (
    <div className="h-screen w-screen bg-transparent">
      <div
        className={cn(
          'flex h-full w-full flex-col overflow-hidden text-foreground',
          isFramed && 'rounded-xl border border-border bg-card shadow-lg',
          props.className
        )}>
        <Caption
          start={start}
          actions={props.actions}
          controls={props.controls}
          className={cn('px-2', isFramed && 'border-b border-border/60')}
        />
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col',
            isFramed ? 'bg-background' : 'bg-transparent',
            isScrollable ? 'overflow-auto' : 'overflow-hidden'
          )}>
          {props.children}
        </div>
        {props.footer ? (
          <footer className="flex shrink-0 justify-end gap-2.5 border-t border-border/60 bg-card px-5 py-3">
            {props.footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}

export { WindowFrame }
export type { WindowFrameProps }
