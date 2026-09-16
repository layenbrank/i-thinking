import { useThreadTokenUsage } from '@assistant-ui/ai-sdk'
import { useAuiState, type ThreadMessage } from '@assistant-ui/react'
import { Button } from '@i-thinking/design/components/button'
import { useCopyToClipboard } from '@i-thinking/design/hooks/use-copy-to-clipboard'
import {
  CheckIcon,
  CircleCheckIcon,
  CircleIcon,
  CopyIcon,
  FileIcon,
  Loader2Icon,
  XIcon
} from 'lucide-react'
import { useMemo, type ReactNode } from 'react'

import { findLatestPlan, type PlanItem } from '@/features/agent/plan.ts'
import { useActiveWorkspace } from '@/features/agent/workspace/client.ts'
import { CHAT_TRANSPORTS, resolveChatTransport } from '@/features/chat/transport.ts'
import { formatUsage } from '@/features/chat/usage.ts'
import { useAgentStore } from '@/stores/agent.ts'

/**
 * 右栏 —— 任务详情。
 *
 * 定位是**只读**的当前任务快照：会话运行态、生效的模型、引用过的文件、用量、
 * 工作区路径。凡是「改」的动作都不在这里 ——
 * 换工作区在左栏，换模型/通路/审批在输入区，完整配置在设置页。
 */

/** 引用过的文件：用户的 file / image part 就是引用名单（与提示词里的 attachments 同源） */
function collectReferences(messages: readonly ThreadMessage[]): string[] {
  const names: string[] = []

  for (const message of messages) {
    if (message.role !== 'user') continue

    for (const part of message.content) {
      if (part.type !== 'file' && part.type !== 'image') continue

      const name = part.filename
      if (name && !names.includes(name)) names.push(name)
    }
  }
  return names
}

function Section(props: { label: string; children: ReactNode }) {
  return (
    <section className="border-border/70 bg-background flex flex-col gap-1.5 rounded-lg border px-2.5 py-2">
      <span className="text-muted-foreground text-[11px] font-medium">{props.label}</span>
      {props.children}
    </section>
  )
}

function Row(props: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs leading-5">
      <span className="text-muted-foreground shrink-0">{props.label}</span>
      <span className="min-w-0 truncate text-end">{props.children}</span>
    </div>
  )
}

/** 计划条目：状态只用图标表达，勾选交给 Agent —— 本地勾了也会被下一次整份覆盖抹掉 */
function PlanRow(props: { item: PlanItem }) {
  const { item } = props
  const isDone = item.status === 'completed'
  const isActive = item.status === 'in_progress'

  return (
    <li className="flex items-start gap-1.5 text-xs leading-relaxed">
      {isDone ? (
        <CircleCheckIcon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
      ) : isActive ? (
        <Loader2Icon className="text-primary mt-0.5 size-3.5 shrink-0 animate-spin" />
      ) : (
        <CircleIcon className="text-muted-foreground/60 mt-0.5 size-3.5 shrink-0" />
      )}
      <span className={isDone ? 'text-muted-foreground' : ''}>{item.text}</span>
    </li>
  )
}

interface AsideProps {
  onClose?: () => void
}

export default function AgentAside(props: AsideProps) {
  const messages = useAuiState(function (state) {
    return state.thread.messages
  })
  const isRunning = useAuiState(function (state) {
    return state.thread.isRunning
  })
  const isLoading = useAuiState(function (state) {
    return state.thread.isLoading
  })
  const usage = useThreadTokenUsage()

  const transport = useAgentStore(function (state) {
    return state.settings.chat.transport
  })
  const providerID = useAgentStore(function (state) {
    return state.settings.chat.providerID
  })
  const model = useAgentStore(function (state) {
    return state.settings.chat.model
  })

  const activeWorkspace = useActiveWorkspace()
  const { isCopied, copyToClipboard } = useCopyToClipboard()
  const references = useMemo(
    function () {
      return collectReferences(messages)
    },
    [messages]
  )
  const plan = useMemo(
    function () {
      return findLatestPlan(messages)
    },
    [messages]
  )

  const kind = resolveChatTransport(transport)
  const usageText = formatUsage(usage)
  const stateText = isLoading ? '加载中…' : isRunning ? '生成中…' : '就绪'

  return (
    <aside
      data-slot="agent-aside"
      className="bg-sidebar flex h-full min-h-0 flex-col">
      <header className="border-border bg-background flex h-10 shrink-0 items-center justify-between gap-2 border-b px-3">
        <span className="text-[13px] font-medium">计划</span>
        {props.onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground size-7 rounded-md"
            aria-label="关闭计划栏"
            title="关闭计划栏"
            onClick={props.onClose}>
            <XIcon className="size-3.5" />
          </Button>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2.5">
        <Section label={plan ? `计划（${plan.done}/${plan.total}）` : '计划'}>
          {plan ? (
            <ul className="flex flex-col gap-1">
              {plan.items.map(function (item) {
                return (
                  <PlanRow
                    key={item.id}
                    item={item}
                  />
                )
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground text-xs leading-5">多步任务会自动写计划。</p>
          )}
        </Section>

        <Section label="本会话">
          <Row label="状态">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                data-running={isRunning ? 'true' : 'false'}
                className="bg-muted-foreground data-[running=true]:bg-primary size-1.5 rounded-full"
              />
              {stateText}
            </span>
          </Row>
          <Row label="消息">{messages.length} 条</Row>
          <Row label="通路">{CHAT_TRANSPORTS[kind].label}</Row>
        </Section>

        <Section label="生效模型">
          <p className="text-xs leading-5 break-all">
            {kind === 'online'
              ? model || '服务端默认'
              : `${providerID ?? '自动'} · ${model || '默认'}`}
          </p>
        </Section>

        <Section label={`引用（${references.length}）`}>
          {references.length === 0 ? (
            <p className="text-muted-foreground text-xs leading-5">用 @ 引用工作区文件。</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {references.map(function (name) {
                return (
                  <li
                    key={name}
                    className="flex items-center gap-1.5 text-xs"
                    title={name}>
                    <FileIcon className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="truncate">{name}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        <Section label="用量">
          <p className="text-xs leading-5">{usageText ?? '—'}</p>
        </Section>

        <Section label="工作区">
          {activeWorkspace ? (
            <>
              <p className="text-xs font-medium">{activeWorkspace.title}</p>
              <div className="flex items-start gap-1">
                <p className="text-muted-foreground min-w-0 flex-1 text-xs leading-5 break-all">
                  {activeWorkspace.primaryPath ?? '（无源文件夹）'}
                </p>
                {activeWorkspace.primaryPath ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground shrink-0"
                    aria-label="复制工作区路径"
                    title="复制路径"
                    onClick={function () {
                      copyToClipboard(activeWorkspace.primaryPath as string)
                    }}>
                    {isCopied ? <CheckIcon /> : <CopyIcon />}
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-xs leading-5">未选择</p>
          )}
        </Section>
      </div>
    </aside>
  )
}
