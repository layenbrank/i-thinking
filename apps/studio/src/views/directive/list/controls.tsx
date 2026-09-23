import { Button } from '@i-thinking/design/components/button'
import { Input } from '@i-thinking/design/components/input'
import { ToggleGroup, ToggleGroupItem } from '@i-thinking/design/components/toggle-group'
import { Icon } from '@iconify/react/offline'
import { cn } from 'cn'

import { useCorexStore } from '@/stores/corex'

import { SORT_ICONS, SORT_LABELS, SORT_MODES, type SortMode } from './group'

/**
 * 指令列表的工具件：搜索框、排序开关、全部已读。
 *
 * 卡片墙与编排台左栏都要这几件，只是宽窄不同 —— 工具件只管自己长什么样，
 * 摆在哪一行、占多宽由调用方的 className 说了算。
 */

interface SearchProps {
  value: string
  isCompact?: boolean
  className?: string
  onChange: (value: string) => void
}

/** 左栏窄、卡片墙宽，同一个搜索框用两档高度就够，不必让调用方掏类名改内部布局 */
const SEARCH_HEIGHTS = { compact: 'h-8', regular: 'h-9' }

function DirectiveSearch(props: SearchProps) {
  const isSearching = props.value.length > 0
  const height = props.isCompact ? SEARCH_HEIGHTS.compact : SEARCH_HEIGHTS.regular

  return (
    <div className={cn('relative', props.className)}>
      <Icon
        icon="mdi:magnify"
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={props.value}
        placeholder="搜索名称或描述…"
        className={cn('pr-8 pl-8', height)}
        onChange={function (event) {
          props.onChange(event.target.value)
        }}
      />
      {isSearching ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute top-1/2 right-1 -translate-y-1/2"
          aria-label="清空搜索"
          title="清空搜索"
          onClick={function () {
            props.onChange('')
          }}>
          <Icon icon="mdi:close" />
        </Button>
      ) : null}
    </div>
  )
}

interface MarkReadProps {
  /** 还没看过的指令名；空的话什么都不渲染 */
  names: readonly string[]
  className?: string
}

/** 「全部标为已读」：圆点攒了一片时一次清掉，不必挨个点进去 */
function DirectiveMarkAllRead(props: MarkReadProps) {
  const markSeenAll = useCorexStore(function (state) {
    return state.markSeenAll
  })
  if (props.names.length === 0) return null

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className={cn('text-muted-foreground hover:text-primary', props.className)}
      aria-label={`把 ${props.names.length} 条指令标为已读`}
      title={`把 ${props.names.length} 条指令标为已读`}
      onClick={function () {
        markSeenAll(props.names)
      }}>
      <Icon icon="mdi:email-open-outline" />
    </Button>
  )
}

interface SortProps {
  value: SortMode
  className?: string
  onChange: (mode: SortMode) => void
}

/** 两档排序是互斥的单选，做成等宽的分段控件：窄栏里也不会被挤散 */
function DirectiveSort(props: SortProps) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      spacing={0}
      value={props.value}
      className={cn(props.className)}
      onValueChange={function (value) {
        if (value) props.onChange(value as SortMode)
      }}>
      {SORT_MODES.map(function (mode) {
        return (
          <ToggleGroupItem
            key={mode}
            value={mode}
            aria-label={`按${SORT_LABELS[mode]}排序`}
            className="grow basis-0 gap-1.5 px-2.5 text-xs whitespace-nowrap">
            <Icon icon={SORT_ICONS[mode]} />
            {SORT_LABELS[mode]}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}

export { DirectiveMarkAllRead, DirectiveSearch, DirectiveSort }
