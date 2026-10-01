import { Button } from '@i-thinking/design/components/button'
import { ScrollArea } from '@i-thinking/design/components/scroll-area'
import { Separator } from '@i-thinking/design/components/separator'
import { Icon } from '@iconify/react/offline'
import { AnimatePresence, motion } from 'motion/react'

import { useCorexStore } from '@/stores/corex'

import { EMPTY_RUNS } from '../run/run-status'
import { DirectiveImport, DirectiveMarkAllRead, DirectiveSearch, DirectiveSort } from './controls'
import DirectiveCard from './directive-card'
import { DirectiveGroupSection } from './group-section'
import { DirectivePlaceholder } from './placeholder'
import { makePlaceholderActions } from './placeholder-actions'
import { useDirectiveList } from './use-directive-list'
import { useGroupCollapse } from './use-group-collapse'

/**
 * 卡片墙：指令页的正脸。所有指令按分类（或最近执行）分组铺成网格，
 * 每张卡片自己带着运行状态，点进去才去编排台。
 *
 * 浅底 + 浮起的圆角卡片（参考快捷指令的「白卡叠灰底」），PC 侧保持网格密度与工具栏一行排开。
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
  const collapse = useGroupCollapse(groups, list.sortMode)
  const listKey = `${list.sortMode}:${list.query}`

  const placeholder = makePlaceholderActions(list.state, {
    onNew: function () {
      props.onOpen(list.findNewName())
    },
    onImportFolder: function () {
      void list.importFrom('dir')
    },
    onImportFile: function () {
      void list.importFrom('file')
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
    <div className="flex h-full min-h-0 flex-col bg-muted/35">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 bg-background/80 px-5 py-3 backdrop-blur-md">
        <DirectiveSearch
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
            className="cursor-pointer text-muted-foreground"
            aria-label="重新读取指令目录"
            title="重新读取指令目录"
            onClick={function () {
              void useCorexStore.getState().refreshDirectives()
            }}>
            <Icon icon="mdi:refresh" />
          </Button>
          <DirectiveImport
            onImportFolder={function () {
              void list.importFrom('dir')
            }}
            onImportFile={function () {
              void list.importFrom('file')
            }}
          />
          <Separator
            orientation="vertical"
            className="mx-0.5 h-5"
          />
          <Button
            type="button"
            size="sm"
            className="cursor-pointer rounded-full px-3.5 shadow-xs"
            onClick={function () {
              props.onOpen(list.findNewName())
            }}>
            <Icon icon="mdi:plus" />
            新增指令
          </Button>
        </span>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-5 pb-6">
          {shown === 0 ? (
            <DirectivePlaceholder
              state={list.state}
              detail={list.loadError}
              actions={placeholder}
            />
          ) : (
            <AnimatePresence
              mode="popLayout"
              initial={false}>
              <motion.div
                key={listKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}>
                {groups.map(function (group) {
                  return (
                    <DirectiveGroupSection
                      key={group.key}
                      group={group}
                      variant="wall"
                      isOpen={collapse.isOpen(group.key)}
                      onOpenChange={function (open) {
                        collapse.updateOpen(group.key, open)
                      }}>
                      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        <AnimatePresence
                          mode="popLayout"
                          initial={false}>
                          {group.items.map(function (entry, index) {
                            return (
                              <DirectiveCard
                                key={entry.name}
                                variant="wall"
                                entry={entry}
                                isActive={false}
                                runs={summaries[entry.name] ?? EMPTY_RUNS}
                                stepCount={props.stepCounts[entry.name] ?? 0}
                                now={now}
                                motionIndex={index}
                                onOpen={props.onOpen}
                                onRun={props.onRun}
                              />
                            )
                          })}
                        </AnimatePresence>
                      </div>
                    </DirectiveGroupSection>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
      {list.importDialog}
    </div>
  )
}

export default DirectiveWall
