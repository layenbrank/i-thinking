import type { ToolCallMessagePartProps } from '@assistant-ui/react'
import { Badge } from '@i-thinking/design/components/badge'
import { Button } from '@i-thinking/design/components/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@i-thinking/design/components/collapsible'
import {
  CheckIcon,
  ChevronRightIcon,
  Loader2Icon,
  ShieldAlertIcon,
  TerminalIcon,
  XIcon
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { chatModelPort } from '@/features/chat/port/instance.ts'
import { AGENT_TOOL_LABELS, type AgentToolName } from '@/shared/agent-tools'

function findLabel(toolName: string): string {
  return AGENT_TOOL_LABELS[toolName as AgentToolName] ?? toolName
}

/** 摘要行：把参数里最有信息量的那一项摆出来（路径优先） */
function summarize(args: unknown): string {
  if (!args || typeof args !== 'object') return ''

  const record = args as Record<string, unknown>
  const path = typeof record.path === 'string' ? record.path : ''
  const query = typeof record.query === 'string' ? record.query : ''
  if (path && query) return `${path} · ${query}`
  if (path) return path
  if (query) return query
  return ''
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    console.warn('[agent] 工具参数不可序列化，回退 String()', error)
    return String(value)
  }
}

/**
 * 工具卡：一行摘要 + 展开详情 + 待审批时的放行/拒绝。
 *
 * 审批按钮直接打回主进程（`chatModelPort.respondToApproval`）——
 * 运行此刻正卡在工具的 `execute` 之前等这个回执。
 */
export function AgentToolCard(props: ToolCallMessagePartProps) {
  const [isOpen, updateOpen] = useState(false)
  const approval = props.approval
  const needsApproval = Boolean(approval) && approval?.approved === undefined
  const isRunning = props.status?.type === 'running'
  const isDone = props.status?.type === 'complete'

  function handleApprove(approved: boolean) {
    chatModelPort.respondToApproval?.({ toolCallId: props.toolCallId, approved })
    toast.success(approved ? '已放行' : '已拒绝', { duration: 1000 })
  }

  return (
    <div
      data-state={needsApproval ? 'approval' : isRunning ? 'running' : isDone ? 'done' : 'error'}
      className="bg-background my-2 flex flex-col gap-1.5 overflow-hidden rounded-lg border data-[state=approval]:border-primary">
      <Collapsible
        open={isOpen}
        onOpenChange={updateOpen}>
        <CollapsibleTrigger
          className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-start text-xs"
          aria-label={`${findLabel(props.toolName)} 详情`}>
          <ChevronRightIcon
            data-open={isOpen ? 'true' : 'false'}
            className="text-muted-foreground size-3 shrink-0 transition-transform data-[open=true]:rotate-90"
          />
          <TerminalIcon className="text-muted-foreground size-3.5 shrink-0" />
          <span className="shrink-0 font-medium">{findLabel(props.toolName)}</span>
          <span className="text-muted-foreground min-w-0 flex-1 truncate">
            {summarize(props.args)}
          </span>
          {isRunning ? (
            <Loader2Icon className="text-muted-foreground size-3.5 shrink-0 animate-spin" />
          ) : null}
          {needsApproval ? (
            <Badge
              variant="secondary"
              className="h-4.5 shrink-0 px-1.5 text-[11px]">
              待审批
            </Badge>
          ) : null}
        </CollapsibleTrigger>

        <CollapsibleContent className="flex flex-col gap-2 px-2.5 pb-2.5">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-[11px]">参数</span>
            <pre className="bg-muted m-0 max-h-65 overflow-auto rounded-md p-2 font-mono text-[11px] leading-normal break-all whitespace-pre-wrap">
              {formatJson(props.args)}
            </pre>
          </div>
          {props.result === undefined ? null : (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-[11px]">
                {props.isError ? '错误' : '结果'}
              </span>
              <pre className="bg-muted m-0 max-h-65 overflow-auto rounded-md p-2 font-mono text-[11px] leading-normal break-all whitespace-pre-wrap">
                {formatJson(props.result)}
              </pre>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {needsApproval ? (
        <div className="bg-muted flex items-center gap-2 border-t px-2.5 py-2">
          <ShieldAlertIcon className="text-primary size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-xs">
            {props.approval?.prompt ?? '需要你确认后才会执行'}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={function () {
              handleApprove(false)
            }}>
            <XIcon />
            拒绝
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={function () {
              handleApprove(true)
            }}>
            <CheckIcon />
            放行
          </Button>
        </div>
      ) : null}
    </div>
  )
}
