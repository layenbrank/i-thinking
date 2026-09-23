import { Button } from '@i-thinking/design/components/button'
import { Separator } from '@i-thinking/design/components/separator'
import { Icon } from '@iconify/react/offline'

import { useCorexStore } from '@/stores/corex'

import { EMPTY_RUNS } from '../run/run-status'
import { DirectiveMarkAllRead, DirectiveSearch, DirectiveSort } from './controls'
import DirectiveCard from './directive-card'
import { DirectivePlaceholder } from './placeholder'
import { makePlaceholderActions } from './placeholder-actions'
import { useDirectiveList } from './use-directive-list'

/**
 * 卡片墙：指令页的正脸。所有指令按分类（或最近执行）分组铺成网格，
 * 每张卡片自己带着运行状态，点进去才去编排台。
 *
 * 跟左栏（`directive-list.tsx`）是同一份数据、同一个 hook，只是排布不同：
 * 这里横向铺开，所以工具件能排成一行；栏宽窄的地方才需要上下叠。
 *
 * 工具件分成三段：搜索（伸缩，唯一会变宽变窄的）、排序（固定）、动作簇（固定，左侧一条分隔线）。
 * 三段之间靠分隔线分界、统一 32px 高，比五个控件平铺一行各自为政要好认。
 *
 * 卡片墙只跟运行台上下分，不再套左右分栏；起一条运行后运行台自己会摊开。
 */

interface Props {
  /** 与运行台共用同一份步骤数，别各自算一遍 */
  stepCounts: Record<string, number>
  onOpen: (name: string) => void
  onRun: (name: string) => void
}

function DirectiveWall(props: Props) {
  const list = useDirectiveList()
  const { groups, now, shown, summaries } = list

  const placeholder = makePlaceholderActions(list.state, {
    onNew: function () {
      props.onOpen(list.findNewName())
    },
    onClearQuery: function () {
      list.updateQuery('')
    },
    onRetry: list.retry,
    onRefresh: function () {
      void useCorexStore.getState().refreshDirectives()
    }
  })

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <DirectiveSearch
          isCompact
          value={list.query}
          className="min-w-56 max-w-md flex-1"
          onChange={list.updateQuery}
        />
        <DirectiveSort
          value={list.sortMode}
          className="shrink-0"
          onChange={list.handleSort}
        />

        <span className="ml-auto flex shrink-0 items-center gap-1">
          <DirectiveMarkAllRead names={list.unread} />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="重新读取指令目录"
            title="重新读取指令目录"
            onClick={function () {
              void useCorexStore.getState().refreshDirectives()
            }}>
            <Icon icon="mdi:refresh" />
          </Button>
          <Separator
            orientation="vertical"
            className="mx-0.5 h-5"
          />
          <Button
            type="button"
            size="sm"
            onClick={function () {
              props.onOpen(list.findNewName())
            }}>
            <Icon icon="mdi:plus" />
            新增指令
          </Button>
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {shown === 0 ? (
          <DirectivePlaceholder
            state={list.state}
            detail={list.loadError}
            actions={placeholder}
          />
        ) : (
          groups.map(function (group) {
            return (
              <section
                key={group.key}
                className="pb-6">
                <h3 className="sticky top-0 z-10 -mx-4 flex items-center gap-2 border-b bg-background/95 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur">
                  <Icon
                    icon={group.icon}
                    className="size-3.5"
                  />
                  {group.label}
                  <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums">
                    {group.items.length}
                  </span>
                </h3>
                <div className="grid gap-3 pt-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {group.items.map(function (entry) {
                    return (
                      <DirectiveCard
                        key={entry.name}
                        variant="wall"
                        entry={entry}
                        isActive={false}
                        runs={summaries[entry.name] ?? EMPTY_RUNS}
                        stepCount={props.stepCounts[entry.name] ?? 0}
                        now={now}
                        onOpen={props.onOpen}
                        onRun={props.onRun}
                      />
                    )
                  })}
                </div>
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}

export default DirectiveWall
