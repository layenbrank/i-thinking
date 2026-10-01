import { Icon } from '@iconify/react/offline'
import { cn } from 'cn'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

import { GROUP_BODY, groupTransition } from './motion'
import type { DirectiveGroup } from './types'

/**
 * 分组标题 + 可折叠内容。卡片墙与左栏共用：差别只在标题粘性边距与内容排布 class。
 *
 * 墙面标题靠字重与字号分层（参考快捷指令的大分组标题），不做厚重 sticky 条；
 * 粘性时仍铺一层半透明底，免得滚上去时字叠在卡片上。
 */

interface Props {
  group: DirectiveGroup
  isOpen: boolean
  /** wall 宽网格 / rail 窄列表，粘性标题的负边距不一样 */
  variant: 'wall' | 'rail'
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

const VARIANT = {
  wall: {
    section: 'pb-7',
    heading: '-mx-5 px-5 py-2.5 bg-muted/70 backdrop-blur-md',
    body: 'pt-3',
    title: 'text-sm font-semibold tracking-tight text-foreground',
    count: 'rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs'
  },
  rail: {
    section: 'pb-1.5',
    heading: '-mx-2.5 px-2.5 py-1.5 bg-background/95 backdrop-blur-sm',
    body: '',
    title: 'text-xs font-medium tracking-wide text-muted-foreground',
    count: 'tabular-nums'
  }
} as const

function DirectiveGroupSection(props: Props) {
  const { group, isOpen } = props
  const chrome = VARIANT[props.variant]
  const isReducedMotion = useReducedMotion()

  return (
    <section className={chrome.section}>
      <h3 className={cn('sticky top-0 z-10', chrome.heading)}>
        <button
          type="button"
          aria-expanded={isOpen}
          className={cn(
            'group/head -mx-1 flex w-[calc(100%+0.5rem)] cursor-pointer items-center gap-2 rounded-xl px-1.5 py-1',
            chrome.title,
            'transition-colors hover:bg-accent-hover/80',
            'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none'
          )}
          onClick={function () {
            props.onOpenChange(!isOpen)
          }}>
          <motion.span
            aria-hidden
            animate={{ rotate: isOpen ? 0 : -90 }}
            transition={groupTransition(!!isReducedMotion)}
            className="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground/80">
            <Icon
              icon="mdi:chevron-down"
              className="size-4"
            />
          </motion.span>
          <Icon
            icon={group.icon}
            className="size-3.5 shrink-0 text-muted-foreground"
          />
          <span className="truncate">{group.label}</span>
          <span className={cn('tabular-nums', chrome.count)}>{group.items.length}</span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="body"
            initial="closed"
            animate="open"
            exit="closed"
            variants={GROUP_BODY}
            transition={groupTransition(!!isReducedMotion)}
            className={cn('overflow-hidden', chrome.body)}>
            {props.children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}

export { DirectiveGroupSection }
