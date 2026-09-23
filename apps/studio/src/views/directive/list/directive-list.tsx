import { Button } from '@i-thinking/design/components/button'
import { Icon } from '@iconify/react/offline'

import type { CorexRun } from '@/stores/corex'
import { useCorexStore } from '@/stores/corex'

import { EMPTY_RUNS } from '../run/run-status'
import { DirectiveMarkAllRead, DirectiveSearch, DirectiveSort } from './controls'
import DirectiveCard from './directive-card'
import { DirectivePlaceholder } from './placeholder'
import { makePlaceholderActions } from './placeholder-actions'
import { useDirectiveList } from './use-directive-list'

/**
 * 指令列表（左栏）：搜索 + 分组 + 卡片。卡片上的状态徽标与最近执行时间都来自运行记录，
 * 所以「哪条在跑、哪条刚失败、刚弄的是哪条」不用点进去看。
 *
 * 分组有两种角度：按分类找功能，按最近执行找「刚在弄的那条」。分组结果由 `groupDirectives`
 * 一次算完，这里只管展示。
 *
 * 搜索框与排序各占一行：栏宽下限只有 240px，挤一行时输入框会被压到没法看。
 */

interface Props {
  activeName: string
  runs: readonly CorexRun[]
  /** 与运行台共用同一份步骤数，别各自算一遍 */
  stepCounts: Record<string, number>
  onOpen: (name: string) => void
  onRun: (name: string) => void
}

function DirectiveList(props: Props) {
  const list = useDirectiveList()
  const { catalog, directives, groups, isSearching, now, shown, summaries } = list
  const isSortedByRecency = list.sortMode === 'RECENT'

  return (
    <div className="flex h-full min-h-0 flex-col border-r bg-background">
      <header className="flex h-12 shrink-0 items-center gap-1.5 border-b px-3">
        <h2 className="flex shrink-0 items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
          <Icon
            icon="mdi:file-document-multiple-outline"
            className="size-4"
          />
          指令
        </h2>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {directives.length}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <DirectiveMarkAllRead names={list.unread} />
          <Button
            type="button"
            variant="outline"
            size="xs"
            aria-label="新增指令"
            title="新增指令"
            onClick={function () {
              props.onOpen(list.findNewName())
            }}>
            <Icon icon="mdi:plus" />
            新增
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="重新读取指令目录"
            title="重新读取指令目录"
            onClick={function () {
              void useCorexStore.getState().refreshDirectives()
            }}>
            <Icon icon="mdi:refresh" />
          </Button>
        </div>
      </header>

      <div className="flex shrink-0 flex-col gap-2 border-b px-2.5 py-2.5">
        <DirectiveSearch
          isCompact
          value={list.query}
          onChange={list.updateQuery}
        />
        <DirectiveSort
          value={list.sortMode}
          className="w-full"
          onChange={list.handleSort}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2.5">
        {shown === 0 ? (
          <DirectivePlaceholder
            isCompact
            state={list.state}
            detail={list.loadError}
            actions={makePlaceholderActions(list.state, {
              isCompact: true,
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
            })}
          />
        ) : (
          groups.map(function (group) {
            return (
              <section
                key={group.key}
                className="pb-1">
                <h3 className="sticky top-0 z-10 -mx-2.5 flex items-center gap-1.5 bg-background px-2.5 py-1.5 text-xs text-muted-foreground">
                  <Icon
                    icon={group.icon}
                    className="size-3.5"
                  />
                  {group.label}
                  <span className="tabular-nums">{group.items.length}</span>
                </h3>
                <div className="flex flex-col gap-1.5">
                  {group.items.map(function (entry) {
                    return (
                      <DirectiveCard
                        key={entry.name}
                        entry={entry}
                        isActive={entry.name === props.activeName}
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

      <footer className="flex shrink-0 items-center gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Icon
            icon={isSortedByRecency ? 'mdi:history' : 'mdi:file-document-multiple-outline'}
            className="size-3.5"
          />
          {isSearching ? `${shown}/${directives.length} 指令` : `${directives.length} 指令`}
        </span>
        <span className="flex items-center gap-1.5">
          <Icon
            icon="mdi:view-grid-outline"
            className="size-3.5"
          />
          {catalog.length} 动作
        </span>
      </footer>
    </div>
  )
}

export default DirectiveList
