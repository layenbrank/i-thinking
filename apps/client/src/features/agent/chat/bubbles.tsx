/**
 * 消息气泡渲染：Think + Markdown + 结构化部件分发
 */
import { Actions, CodeHighlighter, Think } from '@ant-design/x'
import XMarkdown, { type ComponentProps } from '@ant-design/x-markdown'
import { Icon } from '@iconify/react/offline'
import { Button, Flex } from 'antd'
import { useState } from 'react'
import { vs as VSCODE } from 'react-syntax-highlighter/dist/esm/styles/prism'

import { parseParts } from '@/features/agent/model/tools'
import { CodeDiff } from '@/features/agent/parts/code-diff'
import { CompareTable } from '@/features/agent/parts/compare-table'
import { FileCard } from '@/features/agent/parts/file-card'
import { PlanList } from '@/features/agent/parts/plan-list'
import type { AiMessage } from '@/stores/intelligence'
import type { PlanPartData } from '@/features/agent/types'

interface MessageHandlers {
  onApplyDiff?: (messageID: string, partIndex: number) => Promise<void>
  onTogglePlanItem?: (messageID: string, partIndex: number, itemIndex: number) => Promise<void>
  onWritePlanToCalendar?: (messageID: string, partIndex: number) => Promise<void>
  onOpenPlanPane?: (messageID: string, partIndex: number, data: PlanPartData) => void
  onCopyMessage?: (messageID: string) => void
  onDeleteMessage?: (messageID: string) => void
}

interface AgentMessageProps extends MessageHandlers {
  message: AiMessage
  /** 是否正在流式输出（Think 闪烁态） */
  streaming?: boolean
}

function CodeBlock(props: ComponentProps) {
  const { className, children } = props
  const lang = className?.match(/language-(\w+)/)?.[1] || ''

  if (typeof children !== 'string') return null
  return (
    <CodeHighlighter
      highlightProps={{
        style: VSCODE,
        customStyle: { border: 'none' }
      }}
      lang={lang}>
      {children}
    </CodeHighlighter>
  )
}

/** 移除首个 JSON 代码块：结构化部件已接管展示，避免重复渲染原始 JSON */
function stripJsonBlock(fragment: string) {
  return fragment.replace(/```json\s*[\s\S]*?```/i, '').trim()
}

function AgentMessage(props: AgentMessageProps) {
  const { message, streaming } = props
  const [expandedThinking, updateExpandedThinking] = useState(false)

  const parts = parseParts(message.parts)
  const hasStructured = parts.some(function (part) {
    return part.type === 'compare' || part.type === 'plan'
  })
  const fragment = hasStructured ? stripJsonBlock(message.fragment) : message.fragment
  const showActions = message.identity === 'assistant' && !streaming && (fragment || parts.length > 0)

  return (
    <Flex
      vertical
      gap={8}>
      {message.thinking && message.identity === 'assistant' && (
        <Think
          blink={streaming}
          loading={Boolean(streaming && !fragment)}
          expanded={expandedThinking}
          onExpand={updateExpandedThinking}>
          {message.thinking}
        </Think>
      )}
      {fragment && (
        <XMarkdown
          content={fragment}
          components={{ code: CodeBlock }}
        />
      )}
      {parts.map(function (part, partIndex) {
        switch (part.type) {
          case 'file':
            return (
              <FileCard
                key={`file-${partIndex}`}
                data={part.data}
              />
            )
          case 'compare':
            return (
              <CompareTable
                key={`compare-${partIndex}`}
                data={part.data}
              />
            )
          case 'plan':
            return (
              <Flex
                key={`plan-${partIndex}`}
                vertical
                gap={8}>
                <PlanList
                  data={part.data}
                  onToggleItem={function (itemIndex) {
                    void props.onTogglePlanItem?.(message.id, partIndex, itemIndex)
                  }}
                  onWriteCalendar={function () {
                    return props.onWritePlanToCalendar?.(message.id, partIndex) ?? Promise.resolve()
                  }}
                />
                {props.onOpenPlanPane ? (
                  <Button
                    type="link"
                    size="small"
                    style={{ alignSelf: 'flex-start', paddingInline: 0 }}
                    onClick={function () {
                      props.onOpenPlanPane?.(message.id, partIndex, part.data)
                    }}>
                    在侧栏打开
                  </Button>
                ) : null}
              </Flex>
            )
          case 'diff':
            return (
              <CodeDiff
                key={`diff-${partIndex}`}
                part={part}
                onApply={function () {
                  return props.onApplyDiff?.(message.id, partIndex) ?? Promise.resolve()
                }}
              />
            )
          case 'tool':
            return (
              <Flex
                key={`tool-${part.data.toolCallId || partIndex}`}
                align="center"
                gap={6}
                style={{
                  fontSize: 12,
                  color: 'var(--ith-color-text-secondary)',
                  opacity: 0.9
                }}>
                <Icon
                  icon={
                    part.data.status === 'running'
                      ? 'mdi:loading'
                      : part.data.status === 'error'
                        ? 'mdi:alert-circle-outline'
                        : 'mdi:wrench-outline'
                  }
                  width={14}
                  height={14}
                />
                <span>
                  {part.data.status === 'running'
                    ? `调用 ${part.data.name}…`
                    : part.data.status === 'error'
                      ? `${part.data.name} 失败`
                      : `已调用 ${part.data.name}`}
                </span>
              </Flex>
            )
        }
      })}
      {showActions && (
        <Actions
          fadeIn
          items={[
            { key: 'copy', label: '复制', icon: <Icon icon="ant-design:copy-outlined" /> },
            { key: 'delete', label: '删除', icon: <Icon icon="ant-design:delete-outlined" /> }
          ]}
          onClick={function ({ key }) {
            if (key === 'copy') props.onCopyMessage?.(message.id)
            else if (key === 'delete') props.onDeleteMessage?.(message.id)
          }}
        />
      )}
    </Flex>
  )
}

export { AgentMessage }
export type { AgentMessageProps, MessageHandlers }
