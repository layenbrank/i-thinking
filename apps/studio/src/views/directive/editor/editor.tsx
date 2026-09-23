import { Badge } from '@i-thinking/design/components/badge'
import { Button } from '@i-thinking/design/components/button'
import { Card, CardContent } from '@i-thinking/design/components/card'
import { Checkbox } from '@i-thinking/design/components/checkbox'
import { Input } from '@i-thinking/design/components/input'
import { Label } from '@i-thinking/design/components/label'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@i-thinking/design/components/resizable'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@i-thinking/design/components/select'
import { Separator } from '@i-thinking/design/components/separator'
import { Spinner } from '@i-thinking/design/components/spinner'
import { Textarea } from '@i-thinking/design/components/textarea'
import { ToggleGroup, ToggleGroupItem } from '@i-thinking/design/components/toggle-group'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Glide } from '@/components/glide/glide'
import { findModifierLabel } from '@/features/window/shortcuts'
import { useCorexStore, type CorexAction } from '@/stores/corex'

import { createDirective } from '../draft'
import { BUCKET_LABELS, BUCKETS, parseBucket } from '../list/bucket'
import { PERMISSION_ICONS, PERMISSION_KEYS, PERMISSION_LABELS } from '../permissions'
import {
  META_ID,
  META_MAX,
  META_MIN,
  META_SIZE,
  PANEL_GROUP_ID,
  STEPS_ID,
  STEPS_MIN,
  findSplitterState,
  writeSplitterLayout
} from '../splitter'
import { CONTROL_CLASS, Field, Glyph, Section } from './controls'
import { OnErrorSelect } from './on-error'
import StepNode, { AddStepButton } from './step-node'
import { cloneStep, moveStep, nextStepId } from './step-utils'
import type { DirectiveContent, DirectivePermissions, DirectiveTrigger } from './types'

/** Radix Select 不允许空字符串作为选项值 */
const UNCATEGORIZED = 'uncategorized'

/** corex watch 触发器支持的文件事件 */
const WATCH_EVENTS = ['create', 'modify', 'remove', 'access'] as const

/** watch 的防抖/节流触发时机；`默认` = 不写这个键，交给 corex（防抖 trailing、节流 both） */
const EDGE_OPTIONS = ['default', 'leading', 'trailing', 'both'] as const

type EdgeOption = (typeof EDGE_OPTIONS)[number]

const EDGE_LABELS: Record<EdgeOption, string> = {
  default: '默认',
  leading: '前沿',
  trailing: '尾随',
  both: '两者'
}

/** watch 的两个布尔开关，不写就是关 */
const WATCH_FLAGS = [
  { name: 'poll', hint: '轮询检测，文件系统事件不可靠时用' },
  { name: 'immediate', hint: '启动时先对已有文件跑一次' }
] as const

/** `default` 表示不写这个键，让 corex 用它自己的默认时机 */
function toEdge(option: EdgeOption) {
  return option === 'default' ? undefined : option
}

/** 把输入表单的字符串还原为接近 YAML 默认值类型的值 */
function coerceInput(raw: string, def: unknown): unknown {
  if (typeof def === 'boolean') {
    return raw === 'true' || raw === '1' || raw === 'on'
  }
  if (typeof def === 'number') {
    const num = Number(raw)
    return Number.isNaN(num) ? raw : num
  }
  return raw
}

function linesToText(lines: string[] | undefined): string {
  return (lines ?? []).join('\n')
}

function textToLines(text: string): string[] {
  return text
    .split('\n')
    .map(function (line) {
      return line.trim()
    })
    .filter(Boolean)
}

interface VariableValueProps {
  value: unknown
  onChange: (value: unknown) => void
}

function VariableValue(props: VariableValueProps) {
  const value = props.value

  if (typeof value === 'boolean') {
    return (
      <Checkbox
        checked={value}
        aria-label="变量值"
        onCheckedChange={function (checked) {
          props.onChange(checked === true)
        }}
      />
    )
  }

  if (typeof value === 'number') {
    return (
      <Input
        type="number"
        className={CONTROL_CLASS}
        value={value}
        aria-label="变量值"
        onChange={function (event) {
          props.onChange(Number(event.target.value))
        }}
      />
    )
  }

  const text =
    typeof value === 'string'
      ? value
      : value === undefined || value === null
        ? ''
        : JSON.stringify(value)
  return (
    <Input
      type="text"
      className={CONTROL_CLASS}
      value={text}
      aria-label="变量值"
      onChange={function (event) {
        props.onChange(event.target.value)
      }}
    />
  )
}

interface VariablesEditorProps {
  variables: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

/**
 * 变量行。
 *
 * key 用位置而不是变量名：行只能追加和删除（顺序由变量表自己定，界面不提供排序），
 * 位置在一行活着的时候不变；换成变量名当 key 的话，改一个字整行就被 React 重挂，
 * 输入框当场丢焦点，只能一个字一个字地改。
 */
function VariablesEditor(props: VariablesEditorProps) {
  const entries = Object.entries(props.variables)

  return (
    <div className="flex flex-col gap-2">
      {entries.map(function (entry, index) {
        const key = entry[0]
        return (
          <div
            key={index}
            className="flex flex-col gap-1.5 rounded-lg border bg-background p-2">
            <div className="flex items-center gap-1.5">
              <Input
                className={CONTROL_CLASS}
                value={key}
                aria-label="变量名"
                onChange={function (event) {
                  const next: Record<string, unknown> = {}
                  Object.entries(props.variables).forEach(function (item) {
                    next[item[0] === key ? event.target.value : item[0]] = item[1]
                  })
                  props.onChange(next)
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="删除变量"
                onClick={function () {
                  const next = { ...props.variables }
                  delete next[key]
                  props.onChange(next)
                }}>
                <Glyph icon="mdi:close" />
              </Button>
            </div>
            <VariableValue
              value={entry[1]}
              onChange={function (next) {
                props.onChange({ ...props.variables, [key]: next })
              }}
            />
          </div>
        )
      })}
      <Button
        type="button"
        variant="dashed"
        size="sm"
        className="w-fit"
        onClick={function () {
          props.onChange({ ...props.variables, [`var${entries.length + 1}`]: '' })
        }}>
        <Glyph icon="mdi:plus" />
        添加变量
      </Button>
    </div>
  )
}

interface PermissionsEditorProps {
  permissions: DirectivePermissions
  onChange: (next: DirectivePermissions) => void
}

function PermissionsEditor(props: PermissionsEditorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {PERMISSION_KEYS.map(function (key) {
        const id = `perm-${key}`
        return (
          <div
            key={key}
            className="flex items-center gap-2">
            <Checkbox
              id={id}
              checked={Boolean(props.permissions[key])}
              onCheckedChange={function (checked) {
                props.onChange({ ...props.permissions, [key]: checked === true })
              }}
            />
            <Label
              htmlFor={id}
              className="text-xs font-normal">
              <Glyph icon={PERMISSION_ICONS[key]} />
              {PERMISSION_LABELS[key]}
            </Label>
          </div>
        )
      })}
    </div>
  )
}

interface TriggersEditorProps {
  triggers: DirectiveTrigger[]
  onChange: (next: DirectiveTrigger[]) => void
}

interface EdgeSelectProps {
  label: string
  value: EdgeOption
  onChange: (next: EdgeOption) => void
}

/** 防抖/节流的触发时机（corex `Edge`） */
function EdgeSelect(props: EdgeSelectProps) {
  return (
    <Field label={props.label}>
      <Select
        value={props.value}
        onValueChange={function (value) {
          props.onChange(value as EdgeOption)
        }}>
        <SelectTrigger
          size="sm"
          className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {EDGE_OPTIONS.map(function (option) {
            return (
              <SelectItem
                key={option}
                value={option}>
                {EDGE_LABELS[option]}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </Field>
  )
}

function TriggersEditor(props: TriggersEditorProps) {
  function patch(index: number, next: DirectiveTrigger) {
    props.onChange(
      props.triggers.map(function (trigger, i) {
        return i === index ? next : trigger
      })
    )
  }

  function remove(index: number) {
    props.onChange(
      props.triggers.filter(function (_, i) {
        return i !== index
      })
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {props.triggers.map(function (trigger, index) {
        return (
          <Card
            key={index}
            className="gap-2 rounded-lg py-3 shadow-none">
            <CardContent className="flex flex-col gap-2 px-3">
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className="gap-1">
                  <Glyph icon={trigger.type === 'cron' ? 'mdi:clock-outline' : 'mdi:eye-outline'} />
                  {trigger.type}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="删除触发器"
                  onClick={function () {
                    remove(index)
                  }}>
                  <Glyph icon="mdi:close" />
                </Button>
              </div>
              {trigger.type === 'cron' ? (
                <div className="flex flex-col gap-2">
                  <Field label="expr（cron 表达式）">
                    <Input
                      className={CONTROL_CLASS}
                      value={trigger.expr}
                      placeholder="0 9 * * 1-5"
                      onChange={function (event) {
                        patch(index, { ...trigger, expr: event.target.value })
                      }}
                    />
                  </Field>
                  <Field label="timezone">
                    <Input
                      className={CONTROL_CLASS}
                      value={trigger.timezone ?? ''}
                      placeholder="local | utc | ±HH:MM"
                      onChange={function (event) {
                        patch(index, { ...trigger, timezone: event.target.value })
                      }}
                    />
                  </Field>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Field label="paths（每行一个）">
                    <Textarea
                      className="field-sizing-fixed min-h-16 text-xs"
                      rows={2}
                      value={linesToText(trigger.paths)}
                      onChange={function (event) {
                        patch(index, { ...trigger, paths: textToLines(event.target.value) })
                      }}
                    />
                  </Field>
                  <Field label="events（监听哪些文件事件）">
                    <ToggleGroup
                      type="multiple"
                      size="sm"
                      variant="outline"
                      spacing={4}
                      value={trigger.events ?? []}
                      onValueChange={function (value) {
                        patch(index, {
                          ...trigger,
                          events: WATCH_EVENTS.filter(function (name) {
                            return value.includes(name)
                          })
                        })
                      }}
                      className="flex-wrap justify-start">
                      {WATCH_EVENTS.map(function (name) {
                        return (
                          <ToggleGroupItem
                            key={name}
                            value={name}
                            className="h-7 rounded-full px-2.5 text-xs">
                            {name}
                          </ToggleGroupItem>
                        )
                      })}
                    </ToggleGroup>
                  </Field>
                  <Field label="includes（每行一个）">
                    <Textarea
                      className="field-sizing-fixed min-h-16 text-xs"
                      rows={2}
                      value={linesToText(trigger.includes)}
                      onChange={function (event) {
                        patch(index, { ...trigger, includes: textToLines(event.target.value) })
                      }}
                    />
                  </Field>
                  <Field label="excludes（每行一个）">
                    <Textarea
                      className="field-sizing-fixed min-h-16 text-xs"
                      rows={2}
                      value={linesToText(trigger.excludes)}
                      onChange={function (event) {
                        patch(index, { ...trigger, excludes: textToLines(event.target.value) })
                      }}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <EdgeSelect
                      label="debounce（默认 trailing）"
                      value={trigger.debounce ?? 'default'}
                      onChange={function (next) {
                        patch(index, { ...trigger, debounce: toEdge(next) })
                      }}
                    />
                    <Field label="debounce_ms">
                      <Input
                        type="number"
                        className={CONTROL_CLASS}
                        value={trigger.debounce_ms ?? ''}
                        onChange={function (event) {
                          const raw = event.target.value
                          patch(index, {
                            ...trigger,
                            ...(raw === '' ? {} : { debounce_ms: Number(raw) })
                          })
                        }}
                      />
                    </Field>
                    <EdgeSelect
                      label="throttle（默认 both）"
                      value={trigger.throttle ?? 'default'}
                      onChange={function (next) {
                        patch(index, { ...trigger, throttle: toEdge(next) })
                      }}
                    />
                    <Field label="throttle_ms（必须大于 0）">
                      <Input
                        type="number"
                        className={CONTROL_CLASS}
                        value={trigger.throttle_ms ?? ''}
                        onChange={function (event) {
                          const raw = event.target.value
                          patch(index, {
                            ...trigger,
                            ...(raw === '' ? {} : { throttle_ms: Number(raw) })
                          })
                        }}
                      />
                    </Field>
                    <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                      {WATCH_FLAGS.map(function (flag) {
                        const id = `trigger-${flag.name}-${index}`
                        return (
                          <div
                            key={flag.name}
                            className="flex items-center gap-2">
                            <Checkbox
                              id={id}
                              checked={Boolean(trigger[flag.name])}
                              onCheckedChange={function (checked) {
                                patch(index, { ...trigger, [flag.name]: checked === true })
                              }}
                            />
                            <Label
                              htmlFor={id}
                              title={flag.hint}
                              className="font-mono text-xs font-normal">
                              {flag.name}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
      <div className="flex gap-1.5">
        <Button
          type="button"
          variant="dashed"
          size="sm"
          onClick={function () {
            props.onChange([...props.triggers, { type: 'cron', expr: '' }])
          }}>
          <Glyph icon="mdi:clock-outline" />
          添加 cron
        </Button>
        <Button
          type="button"
          variant="dashed"
          size="sm"
          onClick={function () {
            props.onChange([...props.triggers, { type: 'watch', paths: [] }])
          }}>
          <Glyph icon="mdi:eye-outline" />
          添加 watch
        </Button>
      </div>
    </div>
  )
}

/** 输入初值：YAML 里写了 default 就用它，没写留空 */
function initialInputs(content: DirectiveContent): Record<string, string> {
  const values: Record<string, string> = {}
  content.inputs.forEach(function (input) {
    values[input.name] = input.default !== undefined ? String(input.default) : ''
  })
  return values
}

interface Props {
  /** 要打开的指令；空串表示还没选过，退回列表第一条 */
  name: string
  /** 列表收起后标题栏仍留一个按钮，否则没法把列表叫回来 */
  isListOpen: boolean
  onOpen: (name: string) => void
  onToggleList: () => void
  onRun: (name: string, input: Record<string, unknown>) => void
}

/**
 * 指令编辑器：上元数据/输入/变量/权限/触发器，下步骤树（递归控制流）。
 * 草稿按指令名分桶，来回切换不丢未保存的改动；运行交给下方运行台。
 */
export default function Editor({ name, isListOpen, onOpen, onToggleList, onRun }: Props) {
  const catalog = useCorexStore(function (state) {
    return state.catalog
  })
  const directives = useCorexStore(function (state) {
    return state.directives
  })

  const [drafts, setDrafts] = useState<Record<string, DirectiveContent>>({})
  /** 已落盘内容的 JSON 快照，用来判断草稿脏没脏 */
  const [saved, setSaved] = useState<Record<string, string>>({})
  const [inputValues, setInputValues] = useState<Record<string, Record<string, string>>>({})
  /** 按指令名记错误：切走再切回来还看得到当初为什么没跑起来 */
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [defaultLayout] = useState(findSplitterState)
  /** 快捷键提示里的修饰键：macOS 是 ⌘，其余是 Ctrl */
  const modifier = findModifierLabel()

  /** 读过的指令不再重读，否则切回去会把没保存的草稿冲掉 */
  const loadedRef = useRef(new Set<string>())

  const activeName = name || (directives[0]?.name ?? '')
  /** 目录里还没有这个名字 = 刚点「新增」的指令：骨架先在本地支着，保存后才落到磁盘 */
  const isPending =
    activeName !== '' &&
    !directives.some(function (entry) {
      return entry.name === activeName
    })
  const content = drafts[activeName] ?? (isPending ? createDirective(activeName) : null)
  const values = inputValues[activeName] ?? {}
  const error = errors[activeName] ?? null
  const isDirty = content !== null && saved[activeName] !== JSON.stringify(content)

  useEffect(
    function () {
      if (!activeName || isPending || loadedRef.current.has(activeName)) return
      loadedRef.current.add(activeName)
      void useCorexStore
        .getState()
        .loadDirective(activeName)
        .then(function (loaded) {
          setSaved(function (prev) {
            return { ...prev, [loaded.name]: JSON.stringify(loaded) }
          })
          setDrafts(function (prev) {
            return { ...prev, [loaded.name]: loaded }
          })
          setInputValues(function (prev) {
            return { ...prev, [loaded.name]: initialInputs(loaded) }
          })
          reportError(loaded.name, null)
        })
        .catch(function (err) {
          // 失败别占坑，切回来时还能再试一次
          loadedRef.current.delete(activeName)
          console.error('[directive] 读取指令失败', err)
          reportError(activeName, err instanceof Error ? err.message : String(err))
        })
    },
    [activeName, isPending]
  )

  function reportError(name: string, message: string | null) {
    setErrors(function (prev) {
      return { ...prev, [name]: message }
    })
  }

  function updateContent(update: (prev: DirectiveContent) => DirectiveContent) {
    setDrafts(function (prev) {
      // 新指令的第一次编辑还没有草稿可改，得先把骨架补进去，不然这一下编辑会被丢掉
      const current = prev[activeName] ?? (isPending ? createDirective(activeName) : null)
      if (!current) return prev
      const next = update(current)
      return next === current ? prev : { ...prev, [activeName]: next }
    })
  }

  function patchContent(patch: Partial<DirectiveContent>) {
    updateContent(function (prev) {
      return { ...prev, ...patch }
    })
  }

  function setInput(name: string, value: string) {
    setInputValues(function (prev) {
      return { ...prev, [activeName]: { ...prev[activeName], [name]: value } }
    })
  }

  async function save(): Promise<string | null> {
    if (!content) return null
    const saving = activeName
    setIsSaving(true)
    try {
      const document = await useCorexStore.getState().saveDirective(content)
      setSaved(function (prev) {
        const next = { ...prev, [document.name]: JSON.stringify(document.definition) }
        if (document.name !== saving) delete next[saving]
        return next
      })
      loadedRef.current.add(document.name)
      setDrafts(function (prev) {
        const next = { ...prev, [document.name]: document.definition }
        if (document.name !== saving) delete next[saving]
        return next
      })
      if (document.name !== saving) {
        // corex 会规范化名字：草稿跟着改名，标题栏与列表都不该停在旧名字上
        setInputValues(function (prev) {
          const next = { ...prev, [document.name]: prev[saving] ?? {} }
          delete next[saving]
          return next
        })
        // 旧名字的文件 corex 不删，切回去时它还在目录里；不撤掉「已读」标记，
        // 加载器会一直早退，而旧名的草稿刚被删掉 —— 界面就卡在「读取中…」。
        loadedRef.current.delete(saving)
        onOpen(document.name)
      }
      await useCorexStore.getState().refreshDirectives()
      return document.name
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      reportError(saving, message)
      toast.error('保存失败', { description: message })
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function run() {
    if (!content) return

    const missing = content.inputs
      .filter(function (input) {
        return Boolean(input.required) && !(values[input.name] ?? '').trim()
      })
      .map(function (input) {
        return input.name
      })
    if (missing.length > 0) {
      const message = `缺少必填输入: ${missing.join(', ')}`
      reportError(activeName, message)
      toast.error('无法运行', { description: message })
      return
    }

    const input: Record<string, unknown> = {}
    content.inputs.forEach(function (item) {
      const raw = values[item.name] ?? ''
      input[item.name] = raw === '' ? (item.default ?? '') : coerceInput(raw, item.default)
    })

    // 运行前先落盘：corex 跑的是磁盘上那份 YAML
    const target = isDirty ? await save() : activeName
    if (target) onRun(target, input)
  }

  const actionsRef = useRef({ save, run })

  useEffect(function () {
    actionsRef.current = { save, run }
  })

  useEffect(function () {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key === 's') {
        event.preventDefault()
        void actionsRef.current.save()
      } else if (event.key === 'Enter') {
        event.preventDefault()
        void actionsRef.current.run()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return function () {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const header = (
    <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title={isListOpen ? '收起指令列表' : '展开指令列表'}
        aria-label={isListOpen ? '收起指令列表' : '展开指令列表'}
        onClick={onToggleList}>
        <Glyph
          icon={isListOpen ? 'mdi:chevron-double-left' : 'mdi:chevron-double-right'}
          className="size-4"
        />
      </Button>
      <Glyph
        icon="mdi:file-document-outline"
        className="size-4 text-primary"
      />
      <span className="truncate text-sm font-semibold">{activeName || '未选择指令'}</span>
      {isDirty ? (
        <Badge
          variant="outline"
          className="shrink-0 text-muted-foreground">
          未保存
        </Badge>
      ) : null}
      {content ? (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {content.steps.length} 步 · {content.inputs.length} 输入
        </span>
      ) : null}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          title={`保存（${modifier} + S）`}
          disabled={!content || !isDirty || isSaving}
          onClick={function () {
            void save()
          }}>
          {isSaving ? (
            <Spinner aria-label="保存中" />
          ) : (
            <Glyph
              icon="mdi:content-save-outline"
              className="size-4"
            />
          )}
          保存
        </Button>
        <Button
          type="button"
          size="sm"
          title={`运行（${modifier} + Enter）`}
          disabled={!content}
          onClick={function () {
            void run()
          }}>
          <Glyph
            icon="mdi:play"
            className="size-4"
          />
          运行
        </Button>
      </div>
    </header>
  )

  if (!content) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-foreground">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Glyph
            icon="mdi:file-document-outline"
            className="size-7 opacity-70"
          />
          <p>{error ?? (activeName ? '读取中…' : '先在左侧选择一条指令')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-foreground">
      {header}

      <ResizablePanelGroup
        id={PANEL_GROUP_ID}
        orientation="horizontal"
        className="min-h-0 w-full min-w-0"
        style={{ height: 'auto', flex: '1 1 0', minHeight: 0 }}
        defaultLayout={defaultLayout.layouts[PANEL_GROUP_ID]}
        onLayoutChanged={function (layout) {
          writeSplitterLayout(PANEL_GROUP_ID, layout)
        }}>
        <ResizablePanel
          id={META_ID}
          defaultSize={META_SIZE}
          minSize={META_MIN}
          maxSize={META_MAX}
          groupResizeBehavior="preserve-pixel-size"
          className="h-full min-h-0 min-w-0">
          <Glide.Y>
            <aside className="flex flex-col gap-4 p-3.5">
              <Section
                icon={<Glyph icon="mdi:information-outline" />}
                title="基本信息">
                <Field label="名称">
                  <Input
                    className={CONTROL_CLASS}
                    value={content.name}
                    onChange={function (event) {
                      patchContent({ name: event.target.value })
                    }}
                  />
                </Field>
                <Field label="描述">
                  <Textarea
                    className="field-sizing-fixed min-h-16 text-xs"
                    rows={2}
                    value={content.description}
                    onChange={function (event) {
                      patchContent({ description: event.target.value })
                    }}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="版本">
                    <Input
                      className={CONTROL_CLASS}
                      value={content.version}
                      onChange={function (event) {
                        patchContent({ version: event.target.value })
                      }}
                    />
                  </Field>
                  <Field label="分类">
                    <Select
                      value={content.bucket || UNCATEGORIZED}
                      onValueChange={function (value) {
                        patchContent({ bucket: parseBucket(value) })
                      }}>
                      <SelectTrigger
                        size="sm"
                        className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value={UNCATEGORIZED}>未分类</SelectItem>
                        {BUCKETS.map(function (bucket) {
                          return (
                            <SelectItem
                              key={bucket}
                              value={bucket}>
                              {BUCKET_LABELS[bucket]}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </Section>

              <Separator />

              <Section
                icon={<Glyph icon="mdi:import" />}
                title="输入"
                count={content.inputs.length}>
                {content.inputs.length === 0 ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Glyph icon="mdi:import" />
                    无输入
                  </p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {content.inputs.map(function (input) {
                      return (
                        <Field
                          key={input.name}
                          label={input.name}
                          required={Boolean(input.required)}>
                          <Input
                            className={CONTROL_CLASS}
                            value={values[input.name] ?? ''}
                            placeholder={input.description ?? ''}
                            onChange={function (event) {
                              setInput(input.name, event.target.value)
                            }}
                          />
                        </Field>
                      )
                    })}
                  </div>
                )}
              </Section>

              <Separator />

              <Section
                icon={<Glyph icon="mdi:code-braces" />}
                title="变量"
                count={Object.keys(content.variables ?? {}).length}>
                <VariablesEditor
                  variables={content.variables ?? {}}
                  onChange={function (next) {
                    patchContent({ variables: next })
                  }}
                />
              </Section>

              <Separator />

              <Section
                icon={<Glyph icon="mdi:shield-check-outline" />}
                title="权限">
                <PermissionsEditor
                  permissions={content.permissions ?? {}}
                  onChange={function (next) {
                    patchContent({ permissions: next })
                  }}
                />
              </Section>

              <Separator />

              <Section
                icon={<Glyph icon="mdi:lightning-bolt-outline" />}
                title="触发器"
                count={(content.triggers ?? []).length}>
                <TriggersEditor
                  triggers={content.triggers ?? []}
                  onChange={function (next) {
                    patchContent({ triggers: next })
                  }}
                />
              </Section>
            </aside>
          </Glide.Y>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          id={STEPS_ID}
          minSize={STEPS_MIN}
          className="h-full min-h-0 min-w-0">
          <Glide.Y>
            <main className="flex flex-col gap-3 p-3.5">
              <header className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
                  <Glyph icon="mdi:format-list-numbered" />
                  步骤
                  <span className="font-normal tabular-nums">{content.steps.length} 步</span>
                </span>
                <div className="flex items-center gap-2">
                  <span
                    title="步骤自己没写 on_error 时，按这个策略走"
                    className="text-xs text-muted-foreground">
                    失败时
                  </span>
                  <div className="w-44">
                    <OnErrorSelect
                      value={content.on_error ?? 'abort'}
                      onChange={function (next) {
                        patchContent({ on_error: next === 'abort' ? undefined : next })
                      }}
                    />
                  </div>
                </div>
              </header>

              {content.steps.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-xs text-muted-foreground">
                  <Glyph
                    icon="mdi:playlist-plus"
                    className="size-6 opacity-70"
                  />
                  <p>从动作库添加步骤，编排自定义组合</p>
                </div>
              ) : null}
              <div className="flex flex-col gap-2.5">
                {content.steps.map(function (step, index) {
                  return (
                    <StepNode
                      key={step.id || index}
                      step={step}
                      catalog={catalog}
                      onChange={function (next) {
                        updateContent(function (prev) {
                          return {
                            ...prev,
                            steps: prev.steps.map(function (item, i) {
                              return i === index ? next : item
                            })
                          }
                        })
                      }}
                      onRemove={function () {
                        updateContent(function (prev) {
                          return {
                            ...prev,
                            steps: prev.steps.filter(function (_, i) {
                              return i !== index
                            })
                          }
                        })
                      }}
                      onDuplicate={function () {
                        updateContent(function (prev) {
                          const steps = [...prev.steps]
                          steps.splice(index + 1, 0, cloneStep(step))
                          return { ...prev, steps }
                        })
                      }}
                      onMoveUp={
                        index > 0
                          ? function () {
                              updateContent(function (prev) {
                                return { ...prev, steps: moveStep(prev.steps, index, index - 1) }
                              })
                            }
                          : undefined
                      }
                      onMoveDown={
                        index < content.steps.length - 1
                          ? function () {
                              updateContent(function (prev) {
                                return { ...prev, steps: moveStep(prev.steps, index, index + 1) }
                              })
                            }
                          : undefined
                      }
                    />
                  )
                })}
                <AddStepButton
                  catalog={catalog}
                  onPick={function (action: CorexAction) {
                    updateContent(function (prev) {
                      return {
                        ...prev,
                        steps: [
                          ...prev.steps,
                          {
                            id: nextStepId(action.id, prev.steps),
                            action: action.id
                          }
                        ]
                      }
                    })
                  }}
                />
              </div>
            </main>
          </Glide.Y>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
