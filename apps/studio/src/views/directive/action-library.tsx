import { Badge } from '@i-thinking/design/components/badge'
import { Button } from '@i-thinking/design/components/button'
import { Card, CardContent } from '@i-thinking/design/components/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@i-thinking/design/components/dialog'
import { Input } from '@i-thinking/design/components/input'
import { ToggleGroup, ToggleGroupItem } from '@i-thinking/design/components/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@i-thinking/design/components/tooltip'
import { Icon } from '@iconify/react/offline'
import { useMemo, useState } from 'react'

import { useCorexStore, type CorexAction } from '@/stores/corex'

import { BUCKET_ICONS, BUCKET_LABELS, BUCKETS, findBucketMark, type Bucket } from './list/bucket'
import { DirectivePlaceholder, type PlaceholderState } from './list/placeholder'
import { findPermissionIcon, findPermissionLabel } from './permissions'
import TrialPanel from './trial/trial-panel'

/**
 * 动作库：可复用动作的只读目录（corex `list_actions`），按分类筛。
 *
 * 它跟「编辑某条指令」不是一件事，所以不再占页签，而是标题栏上的弹窗 —— 停在哪条指令上
 * 都不影响翻目录。
 *
 * 卡片可以把动作交给「试跑」（`./trial`）：拼指令之前先跑一次，确认参数与输出。试跑是弹窗
 * 里的一个视图，返回即回到目录。
 */

type ActionParam = CorexAction['params'][number]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ParamSummaryProps {
  params: readonly ActionParam[]
}

/**
 * 参数只以一行摘要出现，细节挂在 tooltip 里：动作多的时候，把每个参数都摊开会把
 * 卡片撑得高矮不齐，反倒看不清「这个动作要什么」。
 */
function ParamSummary(props: ParamSummaryProps) {
  if (props.params.length === 0) {
    return (
      <Badge
        variant="outline"
        className="border-dashed text-[11px] font-normal text-muted-foreground">
        无参数
      </Badge>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="cursor-help text-[11px]">
          <Icon icon="mdi:form-textbox" />
          {props.params.length} 个参数
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <ul className="flex flex-col gap-1 py-0.5">
          {props.params.map(function (param) {
            return (
              <li
                key={param.name}
                className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="font-mono text-[11px] font-semibold">{param.name}</span>
                <span className="font-mono text-[11px] opacity-70">{param.ty}</span>
                {param.required ? <span className="text-[10px] opacity-70">必填</span> : null}
                {param.description ? (
                  <span className="text-[11px] opacity-80">{param.description}</span>
                ) : null}
              </li>
            )
          })}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}

function ActionLibraryDialog(props: Props) {
  const catalog = useCorexStore(function (state) {
    return state.catalog
  })
  const isLoaded = useCorexStore(function (state) {
    return state.isLoaded
  })
  const loadError = useCorexStore(function (state) {
    return state.loadError
  })

  const [bucket, setBucket] = useState<Bucket | 'all'>('all')
  const [query, setQuery] = useState('')
  /** 正在试跑的动作；`null` 表示还停在目录上 */
  const [trial, setTrial] = useState<CorexAction | null>(null)

  const keyword = query.trim().toLowerCase()

  const actions = useMemo(
    function () {
      return catalog.filter(function (action) {
        if (bucket !== 'all' && action.bucket !== bucket) return false
        if (!keyword) return true
        return (
          action.name.toLowerCase().includes(keyword) ||
          action.id.toLowerCase().includes(keyword) ||
          action.tags.some(function (tag) {
            return tag.toLowerCase().includes(keyword)
          })
        )
      })
    },
    [catalog, bucket, keyword]
  )

  const state: PlaceholderState = loadError
    ? 'error'
    : !isLoaded
      ? 'loading'
      : keyword || bucket !== 'all'
        ? 'no-match'
        : 'empty'

  /** 关掉弹窗就退出试跑：下次打开该回到目录 */
  function handleOpenChange(open: boolean): void {
    if (!open) setTrial(null)
    props.onOpenChange(open)
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[min(640px,80vh)] flex-col gap-3 sm:max-w-3xl">
        {trial ? (
          // 换动作就重建：草稿、上一次的输出与滚动位置都不带过去
          <TrialPanel
            key={trial.id}
            action={trial}
            onBack={function () {
              setTrial(null)
            }}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-1.5">
                <Icon
                  icon="mdi:view-grid-outline"
                  className="size-4"
                />
                动作库
              </DialogTitle>
              <DialogDescription>
                指令的步骤就是由这些动作拼出来的 ·{' '}
                {isLoaded ? `共 ${catalog.length} 个` : '正在读取…'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex shrink-0 flex-col gap-2.5">
              <div className="relative">
                <Icon
                  icon="mdi:magnify"
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={query}
                  placeholder="搜索动作 ID / 名称 / 标签…"
                  className="pl-8"
                  onChange={function (event) {
                    setQuery(event.target.value)
                  }}
                />
              </div>

              <ToggleGroup
                type="single"
                size="sm"
                spacing={4}
                value={bucket}
                aria-label="动作分类"
                onValueChange={function (value) {
                  if (value) setBucket(value as Bucket | 'all')
                }}
                className="flex-wrap justify-start">
                <ToggleGroupItem
                  value="all"
                  className="h-7 rounded-full px-2.5 text-xs">
                  <Icon icon="mdi:view-grid-outline" />
                  全部
                </ToggleGroupItem>
                {BUCKETS.map(function (item) {
                  return (
                    <ToggleGroupItem
                      key={item}
                      value={item}
                      className="h-7 rounded-full px-2.5 text-xs">
                      <Icon icon={BUCKET_ICONS[item]} />
                      {BUCKET_LABELS[item]}
                    </ToggleGroupItem>
                  )
                })}
              </ToggleGroup>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {actions.length === 0 ? (
                <DirectivePlaceholder
                  state={state}
                  label={
                    {
                      loading: '正在读取动作目录…',
                      error: '没能读取动作目录',
                      empty: 'corex 没有返回任何动作',
                      'no-match': '没有匹配的动作'
                    }[state]
                  }
                  icon={state === 'empty' ? 'mdi:view-grid-outline' : undefined}
                  detail={state === 'error' ? loadError : null}
                  isCompact
                  actions={
                    state === 'error'
                      ? [
                          {
                            label: '重试',
                            icon: 'mdi:refresh',
                            onClick: function () {
                              void useCorexStore.getState().initialize()
                            }
                          }
                        ]
                      : state === 'no-match'
                        ? [
                            {
                              label: '清空筛选',
                              icon: 'mdi:filter-remove-outline',
                              onClick: function () {
                                setQuery('')
                                setBucket('all')
                              }
                            }
                          ]
                        : []
                  }
                />
              ) : (
                <div className="grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2.5 pb-1">
                  {actions.map(function (action) {
                    return (
                      <Card
                        key={action.id}
                        className="h-full gap-0 py-0 shadow-none">
                        <CardContent className="flex h-full flex-col gap-2 p-3">
                          <div className="flex items-start gap-2.5">
                            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              <Icon
                                icon={findBucketMark(action.bucket).icon}
                                className="size-4"
                              />
                            </span>
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold">{action.name}</h3>
                              <Badge
                                variant="outline"
                                className="mt-1 font-mono">
                                {action.id}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {action.description}
                          </p>
                          <div className="mt-auto flex items-end justify-between gap-2 pt-0.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <ParamSummary params={action.params} />
                              {action.permissions.map(function (permission) {
                                return (
                                  <Badge
                                    key={permission}
                                    variant="secondary"
                                    className="text-[11px] font-normal"
                                    title={`该动作会用到：${findPermissionLabel(permission)}`}>
                                    <Icon icon={findPermissionIcon(permission)} />
                                    {findPermissionLabel(permission)}
                                  </Badge>
                                )
                              })}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              className="shrink-0 text-muted-foreground"
                              onClick={function () {
                                setTrial(action)
                              }}>
                              <Icon icon="mdi:play-circle-outline" />
                              试跑
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ActionLibraryDialog
