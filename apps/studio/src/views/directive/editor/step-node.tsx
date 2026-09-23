import { Badge } from '@i-thinking/design/components/badge'
import { Button } from '@i-thinking/design/components/button'
import { Card, CardContent } from '@i-thinking/design/components/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@i-thinking/design/components/collapsible'
import { Input } from '@i-thinking/design/components/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@i-thinking/design/components/popover'
import { ScrollArea } from '@i-thinking/design/components/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@i-thinking/design/components/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@i-thinking/design/components/tooltip'
import { cn } from 'cn'
import { useState, type ReactNode } from 'react'

import type { CorexAction } from '@/stores/corex'

import { findBucketMark } from '../list/bucket'
import { createDefaultValues, formatValue, setParamValue } from '../params/field'
import { ParamField } from '../params/param-field'
import {
  COMPARE_PLACEHOLDER,
  CONDITION_KINDS,
  CONDITION_LABELS,
  conditionKind,
  makeCondition,
  parseOperand,
  type CompareKind,
  type ConditionKind
} from './condition'
import { CONTROL_CLASS, Field, Glyph } from './controls'
import { OnErrorSelect } from './on-error'
import { cloneStep, moveStep, nextStepId } from './step-utils'
import type { Condition, Step, StepsStep } from './types'

const STEP_KIND_LABEL = {
  action: '动作',
  if: '条件分支',
  repeat: '循环',
  parallel: '并行',
  steps: '顺序块'
} as const

function findAction(catalog: CorexAction[], id: string | undefined): CorexAction | undefined {
  if (!id) return undefined
  return catalog.find(function (action) {
    return action.id === id
  })
}

/**
 * 逐步把步骤骨架拼出来。
 *
 * id 由调用方给：新增步骤时用 `nextStepId` 推一个不撞车的；换动作时沿用原 id ——
 * id 是用户可能改过的东西，换个动作不该顺带把它改掉。
 */
function buildStep(action: CorexAction, id: string): Step {
  const params = createDefaultValues(action.params)
  return {
    id,
    action: action.id,
    ...(Object.keys(params).length > 0 ? { params } : {})
  }
}

interface ParamFieldsProps {
  action: CorexAction | undefined
  params: Record<string, unknown> | undefined
  onChange: (name: string, value: unknown) => void
}

function ParamFields(props: ParamFieldsProps) {
  const defs = props.action?.params ?? []
  if (defs.length === 0) {
    return <p className="text-xs text-muted-foreground">该动作无可配置参数</p>
  }

  return (
    <div className="flex flex-col gap-2.5 border-t border-dashed pt-2.5">
      {defs.map(function (param) {
        return (
          <ParamField
            key={param.name}
            param={param}
            value={props.params?.[param.name]}
            onChange={function (value) {
              props.onChange(param.name, value)
            }}
          />
        )
      })}
    </div>
  )
}

interface KindSelectProps {
  kind: ConditionKind
  onChange: (kind: ConditionKind) => void
}

function KindSelect(props: KindSelectProps) {
  return (
    <Select
      value={props.kind}
      onValueChange={function (value) {
        props.onChange(value as ConditionKind)
      }}>
      <SelectTrigger
        size="sm"
        className="w-28 shrink-0"
        aria-label="条件类型">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {CONDITION_KINDS.map(function (kind) {
          return (
            <SelectItem
              key={kind}
              value={kind}>
              {CONDITION_LABELS[kind]}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

interface ConditionNodeProps {
  condition: Condition
  onChange: (next: Condition) => void
}

function ConditionNode(props: ConditionNodeProps) {
  const condition = props.condition
  const isExpr = typeof condition === 'string'
  const kind: ConditionKind = isExpr ? 'expr' : conditionKind(condition)

  function onKindChange(next: ConditionKind) {
    if (next === kind) return
    props.onChange(makeCondition(next))
  }

  if (isExpr) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <KindSelect
            kind={kind}
            onChange={onKindChange}
          />
          <Input
            className={cn(CONTROL_CLASS, 'min-w-0 flex-1')}
            value={condition}
            placeholder="如 {{variables.enabled}}"
            onChange={function (event) {
              props.onChange(event.target.value)
            }}
          />
        </div>
      </div>
    )
  }

  if (kind === 'and' || kind === 'or') {
    const list = (kind === 'and' ? condition.and : condition.or) ?? []
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <KindSelect
            kind={kind}
            onChange={onKindChange}
          />
          <Button
            type="button"
            variant="dashed"
            size="sm"
            onClick={function () {
              props.onChange({ ...condition, [kind]: [...list, ''] })
            }}>
            <Glyph icon="mdi:plus" />
            子条件
          </Button>
        </div>
        <div className="flex flex-col gap-1.5 border-l-2 border-dashed pl-2.5">
          {list.map(function (child, index) {
            return (
              <div
                key={index}
                className="flex items-start gap-1">
                <ConditionNode
                  condition={child}
                  onChange={function (next) {
                    props.onChange({
                      ...condition,
                      [kind]: list.map(function (item, i) {
                        return i === index ? next : item
                      })
                    })
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="删除子条件"
                  onClick={function () {
                    props.onChange({
                      ...condition,
                      [kind]: list.filter(function (_, i) {
                        return i !== index
                      })
                    })
                  }}>
                  <Glyph icon="mdi:close" />
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (kind === 'not') {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <KindSelect
          kind={kind}
          onChange={onKindChange}
        />
        <div className="border-l-2 border-dashed pl-2.5">
          <ConditionNode
            condition={condition.not ?? ''}
            onChange={function (next) {
              props.onChange({ not: next })
            }}
          />
        </div>
      </div>
    )
  }

  const key = kind as CompareKind
  const values = condition[key] ?? []
  const left = values[0]
  const right = values[1]
  const [leftHint, rightHint] = COMPARE_PLACEHOLDER[key]
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <KindSelect
        kind={kind}
        onChange={onKindChange}
      />
      <div className="flex gap-1.5">
        <Input
          className={CONTROL_CLASS}
          value={formatValue(left)}
          placeholder={leftHint}
          aria-label="左值"
          onChange={function (event) {
            props.onChange({ [key]: [parseOperand(event.target.value), right] })
          }}
        />
        <Input
          className={CONTROL_CLASS}
          value={formatValue(right)}
          placeholder={rightHint}
          aria-label="右值"
          onChange={function (event) {
            props.onChange({ [key]: [left, parseOperand(event.target.value)] })
          }}
        />
      </div>
    </div>
  )
}

interface AddStepButtonProps {
  catalog: CorexAction[]
  onPick: (action: CorexAction) => void
}

function AddStepButton(props: AddStepButtonProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const keyword = query.trim().toLowerCase()
  const list = keyword
    ? props.catalog.filter(function (action) {
        return (
          action.name.toLowerCase().includes(keyword) || action.id.toLowerCase().includes(keyword)
        )
      })
    : props.catalog

  function pick(action: CorexAction) {
    props.onPick(action)
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover
      open={open}
      onOpenChange={function (next) {
        setOpen(next)
        if (!next) setQuery('')
      }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="dashed"
          className="w-full">
          <Glyph icon="mdi:plus" />
          添加步骤
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 gap-0 p-0">
        <div className="flex items-center gap-2 border-b px-2.5">
          <Glyph
            icon="mdi:magnify"
            className="text-muted-foreground"
          />
          <Input
            autoFocus
            value={query}
            placeholder="搜索动作…"
            className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
            onChange={function (event) {
              setQuery(event.target.value)
            }}
          />
        </div>
        <ScrollArea className="max-h-64">
          <ul className="flex flex-col gap-0.5 p-1.5">
            {list.map(function (action) {
              const mark = findBucketMark(action.bucket).icon
              return (
                <li key={action.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start gap-2.5 px-2 py-1.5 font-normal"
                    onClick={function () {
                      pick(action)
                    }}>
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Glyph
                        icon={mark}
                        className="size-3.5"
                      />
                    </span>
                    <span className="truncate text-sm">{action.name}</span>
                    <code className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
                      {action.id}
                    </code>
                  </Button>
                </li>
              )
            })}
            {list.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-muted-foreground">没有匹配的动作</li>
            ) : null}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

interface ChildStepsProps {
  steps: Step[]
  catalog: CorexAction[]
  onChange: (steps: Step[]) => void
}

function ChildSteps(props: ChildStepsProps) {
  return (
    <div className="flex flex-col gap-2 border-l-2 pl-3.5">
      {props.steps.map(function (child, index) {
        return (
          <StepNode
            key={child.id || index}
            step={child}
            catalog={props.catalog}
            onChange={function (next) {
              props.onChange(
                props.steps.map(function (item, i) {
                  return i === index ? next : item
                })
              )
            }}
            onRemove={function () {
              props.onChange(
                props.steps.filter(function (_, i) {
                  return i !== index
                })
              )
            }}
            onDuplicate={function () {
              const next = [...props.steps]
              next.splice(index + 1, 0, cloneStep(child))
              props.onChange(next)
            }}
            onMoveUp={
              index > 0
                ? function () {
                    props.onChange(moveStep(props.steps, index, index - 1))
                  }
                : undefined
            }
            onMoveDown={
              index < props.steps.length - 1
                ? function () {
                    props.onChange(moveStep(props.steps, index, index + 1))
                  }
                : undefined
            }
          />
        )
      })}
      <AddStepButton
        catalog={props.catalog}
        onPick={function (action) {
          props.onChange([...props.steps, buildStep(action, nextStepId(action.id, props.steps))])
        }}
      />
    </div>
  )
}

interface IconActionProps {
  label: string
  icon: string
  onClick: () => void
  className?: string
}

/** 带 tooltip 的图标动作按钮（步骤头部一排操作共用） */
function IconAction(props: IconActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={props.label}
          className={cn('text-muted-foreground', props.className)}
          onClick={props.onClick}>
          <Glyph icon={props.icon} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{props.label}</TooltipContent>
    </Tooltip>
  )
}

interface StepHeaderProps {
  icon: ReactNode
  kindLabel: string
  id: string
  title: ReactNode
  onIdChange: (id: string) => void
  onRemove: () => void
  onDuplicate?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

function StepHeader(props: StepHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary [&_svg]:size-4">
        {props.icon}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        {typeof props.title === 'string' ? (
          <span className="truncate text-sm font-semibold">{props.title}</span>
        ) : (
          props.title
        )}
        <Badge
          variant="secondary"
          className="w-fit">
          {props.kindLabel}
        </Badge>
      </div>
      <Input
        className="ml-auto h-7 w-28 border-transparent bg-transparent text-right font-mono text-xs text-muted-foreground shadow-none hover:border-input focus-visible:bg-background"
        value={props.id}
        aria-label="步骤 id"
        onChange={function (event) {
          props.onIdChange(event.target.value)
        }}
      />
      <div className="flex shrink-0 items-center gap-0.5">
        {props.onMoveUp ? (
          <IconAction
            label="上移"
            icon="mdi:arrow-up"
            onClick={props.onMoveUp}
          />
        ) : null}
        {props.onMoveDown ? (
          <IconAction
            label="下移"
            icon="mdi:arrow-down"
            onClick={props.onMoveDown}
          />
        ) : null}
        {props.onDuplicate ? (
          <IconAction
            label="复制步骤"
            icon="mdi:content-copy"
            onClick={props.onDuplicate}
          />
        ) : null}
        <IconAction
          label="删除步骤"
          icon="mdi:trash-can-outline"
          className="hover:text-destructive"
          onClick={props.onRemove}
        />
      </div>
    </div>
  )
}

interface StepOps {
  onDuplicate?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

interface ActionSelectProps {
  value: string
  catalog: CorexAction[]
  onChange: (action: CorexAction) => void
}

/** 步骤动作切换：换动作时按新动作的参数默认值重建 params，保留步骤 id */
function ActionSelect(props: ActionSelectProps) {
  return (
    <Select
      value={props.value}
      onValueChange={function (id) {
        const action = findAction(props.catalog, id)
        if (action) props.onChange(action)
      }}>
      <SelectTrigger
        size="sm"
        className="h-6 max-w-52 border-transparent bg-transparent px-1 text-sm font-semibold shadow-none"
        aria-label="切换动作">
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        className="max-h-72">
        {props.catalog.map(function (action) {
          return (
            <SelectItem
              key={action.id}
              value={action.id}>
              {action.name}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

interface ActionStepCardProps extends StepOps {
  step: Extract<Step, { action: string }>
  catalog: CorexAction[]
  onChange: (next: Step) => void
  onRemove: () => void
}

function ActionStepCard(props: ActionStepCardProps) {
  const { step, catalog } = props
  const action = findAction(catalog, step.action)
  const mark = findBucketMark(action?.bucket).icon
  const [advanced, setAdvanced] = useState(Boolean(step.when !== undefined || step.save_to))

  return (
    <Card className="gap-3 rounded-xl py-3 shadow-sm">
      <StepHeader
        icon={<Glyph icon={mark} className="size-4" />}
        kindLabel={STEP_KIND_LABEL.action}
        id={step.id}
        title={
          <ActionSelect
            value={step.action}
            catalog={catalog}
            onChange={function (next) {
              props.onChange(buildStep(next, step.id))
            }}
          />
        }
        onIdChange={function (id) {
          props.onChange({ ...step, id })
        }}
        onRemove={props.onRemove}
        onDuplicate={props.onDuplicate}
        onMoveUp={props.onMoveUp}
        onMoveDown={props.onMoveDown}
      />
      <CardContent className="flex flex-col gap-2.5 px-3">
        <code className="font-mono text-xs text-muted-foreground">{step.action}</code>
        <ParamFields
          action={action}
          params={step.params}
          onChange={function (name, value) {
            props.onChange({ ...step, params: setParamValue(step.params ?? {}, name, value) })
          }}
        />
        <Collapsible
          open={advanced}
          onOpenChange={setAdvanced}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="w-fit px-1 text-muted-foreground">
              <Glyph
                icon="mdi:chevron-right"
                className={cn('transition-transform duration-200', advanced && 'rotate-90')}
              />
              高级选项（when / save_to / on_error / retry）
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-2 border-t border-dashed pt-2">
            <Field label="when 条件">
              {step.when !== undefined ? (
                <ConditionNode
                  condition={step.when}
                  onChange={function (next) {
                    props.onChange({ ...step, when: next })
                  }}
                />
              ) : (
                <Button
                  type="button"
                  variant="dashed"
                  size="sm"
                  className="w-fit"
                  onClick={function () {
                    props.onChange({ ...step, when: '' })
                  }}>
                  <Glyph icon="mdi:plus" />
                  添加条件
                </Button>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="save_to">
                <Input
                  className={CONTROL_CLASS}
                  value={step.save_to ?? ''}
                  placeholder="变量名"
                  onChange={function (event) {
                    props.onChange({ ...step, save_to: event.target.value })
                  }}
                />
              </Field>
              <Field label="on_error">
                <OnErrorSelect
                  value={step.on_error ?? 'abort'}
                  onChange={function (next) {
                    props.onChange({ ...step, on_error: next })
                  }}
                />
              </Field>
              <Field label="retry">
                <Input
                  type="number"
                  className={CONTROL_CLASS}
                  value={step.retry ?? ''}
                  placeholder="0"
                  onChange={function (event) {
                    const raw = event.target.value
                    props.onChange({
                      ...step,
                      ...(raw === '' ? {} : { retry: Number(raw) })
                    })
                  }}
                />
              </Field>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

interface IfStepCardProps extends StepOps {
  step: Extract<Step, { if: Condition }>
  catalog: CorexAction[]
  onChange: (next: Step) => void
  onRemove: () => void
}

function IfStepCard(props: IfStepCardProps) {
  const { step, catalog } = props
  return (
    <Card className="gap-3 rounded-xl py-3 shadow-sm">
      <StepHeader
        icon={<Glyph icon="mdi:source-branch" className="size-4" />}
        kindLabel={STEP_KIND_LABEL.if}
        id={step.id}
        title="条件分支"
        onIdChange={function (id) {
          props.onChange({ ...step, id })
        }}
        onRemove={props.onRemove}
        onDuplicate={props.onDuplicate}
        onMoveUp={props.onMoveUp}
        onMoveDown={props.onMoveDown}
      />
      <CardContent className="flex flex-col gap-3 px-3">
        <div className="flex items-start gap-2">
          <span className="inline-flex items-center gap-1 pt-2 font-mono text-xs font-semibold text-muted-foreground">
            <Glyph icon="mdi:help-rhombus-outline" />
            if
          </span>
          <ConditionNode
            condition={step.if}
            onChange={function (next) {
              props.onChange({ ...step, if: next })
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-muted-foreground">
            <Glyph icon="mdi:arrow-right-bottom" />
            then
          </span>
          <ChildSteps
            steps={step.then}
            catalog={catalog}
            onChange={function (next) {
              props.onChange({ ...step, then: next })
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-muted-foreground">
            <Glyph icon="mdi:arrow-right-top" />
            else
          </span>
          <ChildSteps
            steps={step.else ?? []}
            catalog={catalog}
            onChange={function (next) {
              props.onChange({ ...step, else: next })
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

interface RepeatStepCardProps extends StepOps {
  step: Extract<Step, { repeat: object }>
  catalog: CorexAction[]
  onChange: (next: Step) => void
  onRemove: () => void
}

function RepeatStepCard(props: RepeatStepCardProps) {
  const { step, catalog } = props
  const hasEach = Boolean(step.repeat.each)
  const hasCount = step.repeat.count !== undefined
  return (
    <Card className="gap-3 rounded-xl py-3 shadow-sm">
      <StepHeader
        icon={<Glyph icon="mdi:repeat" className="size-4" />}
        kindLabel={STEP_KIND_LABEL.repeat}
        id={step.id}
        title="循环"
        onIdChange={function (id) {
          props.onChange({ ...step, id })
        }}
        onRemove={props.onRemove}
        onDuplicate={props.onDuplicate}
        onMoveUp={props.onMoveUp}
        onMoveDown={props.onMoveDown}
      />
      <CardContent className="flex flex-col gap-3 px-3">
        <p className="text-xs text-muted-foreground">
          each 与 count 二选一，另一项将被忽略；`as` 绑当前元素（count 模式绑序号），`index`
          绑序号。并发（&gt; 1）时每个元素各拿一份上下文副本、元素之间互不可见；串行则共享同一份上下文。
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="each（数组表达式）">
            <Input
              className={CONTROL_CLASS}
              value={step.repeat.each ?? ''}
              placeholder="{{items}}"
              disabled={hasCount}
              onChange={function (event) {
                props.onChange({ ...step, repeat: { ...step.repeat, each: event.target.value } })
              }}
            />
          </Field>
          <Field label="count（固定次数）">
            <Input
              type="number"
              className={CONTROL_CLASS}
              value={step.repeat.count ?? ''}
              placeholder="0"
              disabled={hasEach}
              onChange={function (event) {
                const raw = event.target.value
                props.onChange({
                  ...step,
                  repeat: { ...step.repeat, ...(raw === '' ? {} : { count: Number(raw) }) }
                })
              }}
            />
          </Field>
          <Field label="as">
            <Input
              className={CONTROL_CLASS}
              value={step.repeat.as ?? 'item'}
              onChange={function (event) {
                props.onChange({ ...step, repeat: { ...step.repeat, as: event.target.value } })
              }}
            />
          </Field>
          <Field label="index">
            <Input
              className={CONTROL_CLASS}
              value={step.repeat.index ?? 'index'}
              onChange={function (event) {
                props.onChange({ ...step, repeat: { ...step.repeat, index: event.target.value } })
              }}
            />
          </Field>
        </div>
        <Field label="max_concurrency（同时跑几个元素 / 几轮）">
          <Input
            type="number"
            className={CONTROL_CLASS}
            value={step.max_concurrency ?? ''}
            placeholder="1（串行）"
            onChange={function (event) {
              const raw = event.target.value
              props.onChange({
                ...step,
                ...(raw === '' ? {} : { max_concurrency: Number(raw) })
              })
            }}
          />
        </Field>
        <ChildSteps
          steps={step.steps}
          catalog={catalog}
          onChange={function (next) {
            props.onChange({ ...step, steps: next })
          }}
        />
      </CardContent>
    </Card>
  )
}

interface ParallelStepCardProps extends StepOps {
  step: Extract<Step, { parallel: Step[] }>
  catalog: CorexAction[]
  onChange: (next: Step) => void
  onRemove: () => void
}

function ParallelStepCard(props: ParallelStepCardProps) {
  const { step, catalog } = props
  return (
    <Card className="gap-3 rounded-xl py-3 shadow-sm">
      <StepHeader
        icon={<Glyph icon="mdi:call-split" className="size-4" />}
        kindLabel={STEP_KIND_LABEL.parallel}
        id={step.id}
        title="并行"
        onIdChange={function (id) {
          props.onChange({ ...step, id })
        }}
        onRemove={props.onRemove}
        onDuplicate={props.onDuplicate}
        onMoveUp={props.onMoveUp}
        onMoveDown={props.onMoveDown}
      />
      <CardContent className="flex flex-col gap-3 px-3">
        <Field label="max_concurrency（最大并行数）">
          <Input
            type="number"
            className={CONTROL_CLASS}
            value={step.max_concurrency ?? ''}
            placeholder="默认 8"
            onChange={function (event) {
              const raw = event.target.value
              props.onChange({
                ...step,
                ...(raw === '' ? {} : { max_concurrency: Number(raw) })
              })
            }}
          />
        </Field>
        <ChildSteps
          steps={step.parallel}
          catalog={catalog}
          onChange={function (next) {
            props.onChange({ ...step, parallel: next })
          }}
        />
      </CardContent>
    </Card>
  )
}

interface StepsStepCardProps extends StepOps {
  step: StepsStep
  catalog: CorexAction[]
  onChange: (next: Step) => void
  onRemove: () => void
}

/** 顺序块：parallel 的分支只吃一个步骤，多步得先收进顺序块 */
function StepsStepCard(props: StepsStepCardProps) {
  const { step, catalog } = props
  return (
    <Card className="gap-3 rounded-xl py-3 shadow-sm">
      <StepHeader
        icon={<Glyph icon="mdi:format-list-numbered" className="size-4" />}
        kindLabel={STEP_KIND_LABEL.steps}
        id={step.id ?? ''}
        title="顺序块"
        onIdChange={function (id) {
          props.onChange({ ...step, id })
        }}
        onRemove={props.onRemove}
        onDuplicate={props.onDuplicate}
        onMoveUp={props.onMoveUp}
        onMoveDown={props.onMoveDown}
      />
      <CardContent className="flex flex-col gap-3 px-3">
        <ChildSteps
          steps={step.steps}
          catalog={catalog}
          onChange={function (next) {
            props.onChange({ ...step, steps: next })
          }}
        />
      </CardContent>
    </Card>
  )
}

interface StepNodeProps {
  step: Step
  catalog: CorexAction[]
  onChange: (next: Step) => void
  onRemove: () => void
  onDuplicate?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

function StepNode(props: StepNodeProps) {
  const shared = {
    catalog: props.catalog,
    onChange: props.onChange,
    onRemove: props.onRemove,
    ...(props.onDuplicate ? { onDuplicate: props.onDuplicate } : {}),
    ...(props.onMoveUp ? { onMoveUp: props.onMoveUp } : {}),
    ...(props.onMoveDown ? { onMoveDown: props.onMoveDown } : {})
  }

  if ('action' in props.step) {
    return (
      <ActionStepCard
        {...shared}
        step={props.step}
      />
    )
  }
  if ('if' in props.step) {
    return (
      <IfStepCard
        {...shared}
        step={props.step}
      />
    )
  }
  if ('repeat' in props.step) {
    return (
      <RepeatStepCard
        {...shared}
        step={props.step}
      />
    )
  }
  if ('parallel' in props.step) {
    return (
      <ParallelStepCard
        {...shared}
        step={props.step}
      />
    )
  }
  return (
    <StepsStepCard
      {...shared}
      step={props.step}
    />
  )
}

export default StepNode
export { AddStepButton }
