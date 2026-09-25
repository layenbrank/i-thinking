import { Button } from '@i-thinking/design/components/button'
import { CheckIcon, ChevronDownIcon, Loader2Icon, TerminalIcon, XIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import {
  collapseOutput,
  TERMINAL_PREVIEW_LINES
} from '@/views/agent/chat/components/tool-output.ts'

/**
 * 命令与代码的「模拟终端」面板。
 *
 * 为什么单独做一套皮：通用卡把参数和结果各铺一个 `<pre>`，看命令执行像在看 JSON。
 * Cursor / Qoder / Copilot 的会话区都用手册风格 —— 提示符 + 等宽输出 + 状态行，
 * 一眼能分清「跑了什么」「输出是什么」「成了没有」。
 *
 * 面板**恒为深色**（不随主题切换）：终端就是深色的，浅色主题下用浅底反而与正文混淆。
 */

/** 输出正文：短输出原样铺，长输出先给前 `maxLines` 行，其余折起来 */
function TerminalOutput(props: { text: string; maxLines: number }) {
  const [isExpanded, updateExpanded] = useState(false)
  const collapsed = collapseOutput(props.text, props.maxLines)
  const lines = isExpanded
    ? collapseOutput(props.text, Number.MAX_SAFE_INTEGER).lines
    : collapsed.lines

  if (collapsed.lines.length === 0) return null

  return (
    <div>
      {lines.map(function (line, index) {
        return (
          // 输出是逐行日志，行内容本身会重复，序号是最可靠的 key
          <div
            key={index}
            className="whitespace-pre-wrap break-all">
            {line}
          </div>
        )
      })}
      {collapsed.hidden > 0 && !isExpanded ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="text-terminal-muted hover:bg-terminal-surface hover:text-terminal-foreground mt-1"
          onClick={function () {
            updateExpanded(true)
          }}>
          <ChevronDownIcon className="size-3" />
          展开全部（还有 {collapsed.hidden} 行）
        </Button>
      ) : null}
    </div>
  )
}

/** 一行内容都没有时的那句占位（统一一处样式） */
function Placeholder(props: { text: string }) {
  return <div className="text-terminal-muted">{props.text}</div>
}

interface TerminalShellProps {
  /** 顶栏：提示符 + 命令，或 `Code Mode · JavaScript` */
  header: ReactNode
  isError: boolean
  isRunning: boolean
  /**
   * 面板底部的补充信息（占位文案）。**只在真要写时才传** ——
   * 恒渲染一句「无输出」会在有输出的时候也挂在末尾，看着像命令白跑了。
   */
  footer?: ReactNode
  children: ReactNode
}

function TerminalShell(props: TerminalShellProps) {
  return (
    <div
      data-state={props.isRunning ? 'running' : props.isError ? 'error' : 'done'}
      className="border-terminal-border bg-terminal text-terminal-foreground overflow-hidden rounded-md border">
      <div className="border-terminal-border bg-terminal-surface/60 flex items-center gap-2 border-b px-2.5 py-1">
        <TerminalIcon className="text-terminal-muted size-3 shrink-0" />
        <div className="min-w-0 flex-1 font-mono text-2xs break-all">{props.header}</div>
        {props.isRunning ? (
          <Loader2Icon className="text-terminal-muted size-3 shrink-0 animate-spin" />
        ) : props.isError ? (
          <XIcon className="text-terminal-danger size-3 shrink-0" />
        ) : (
          <CheckIcon className="text-terminal-accent size-3 shrink-0" />
        )}
      </div>

      <div className="flex max-h-80 flex-col gap-1.5 overflow-auto px-2.5 py-1.5 font-mono text-2xs leading-relaxed">
        {props.children}
        {props.footer ?? null}
      </div>
    </div>
  )
}

/** `shell`：提示符 + 命令在顶栏，下面是输出 */
function ToolCommand(props: {
  command: string
  workdir: string | null
  background: boolean
  output: string | null
  isError: boolean
  isRunning: boolean
}) {
  const hasOutput = props.output !== null && collapseOutput(props.output).lines.length > 0
  const empty = props.isRunning ? '执行中…' : props.isError ? '没有任何输出' : '无输出'

  return (
    <TerminalShell
      isError={props.isError}
      isRunning={props.isRunning}
      footer={hasOutput ? null : <Placeholder text={empty} />}
      header={
        <>
          <span className="text-terminal-accent">$</span> {props.command}
          {props.workdir === null ? null : (
            <span className="text-terminal-muted"> · {props.workdir}</span>
          )}
          {props.background ? <span className="text-terminal-muted"> · 后台</span> : null}
        </>
      }>
      {props.output === null ? null : (
        <TerminalOutput
          text={props.output}
          maxLines={TERMINAL_PREVIEW_LINES}
        />
      )}
    </TerminalShell>
  )
}

/** `execute`（Code Mode）：源码在上、返回结果在下，中间一条分隔线 */
function ToolCodeMode(props: {
  source: string
  output: string | null
  isError: boolean
  isRunning: boolean
}) {
  const empty = props.isRunning ? '执行中…' : props.isError ? '执行失败' : '无返回'

  return (
    <TerminalShell
      isError={props.isError}
      isRunning={props.isRunning}
      footer={props.output === null ? <Placeholder text={empty} /> : null}
      header={<span className="text-terminal-muted">Code Mode · JavaScript</span>}>
      <TerminalOutput
        text={props.source}
        maxLines={12}
      />
      {props.output === null ? null : (
        <div className="border-terminal-border border-t pt-1.5">
          <TerminalOutput
            text={props.output}
            maxLines={TERMINAL_PREVIEW_LINES}
          />
        </div>
      )}
    </TerminalShell>
  )
}

export { ToolCodeMode, ToolCommand }
