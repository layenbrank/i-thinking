/**
 * 会话流事件：对齐 ACP `session/update` 的增量形状。
 *
 * 这是 agent 运行时 → 宿主（studio UI / 外部编辑器）的统一出口，
 * 也是 `packages/chat` 的 ChatStreamEvent 的上游来源（P4 适配）。
 */

interface Usage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

type SessionUpdate =
  | { kind: 'text'; blockID: string; text: string }
  | { kind: 'reasoning'; blockID: string; text: string }
  | { kind: 'tool-call'; toolCallId: string; toolName: string; input: unknown }
  | {
      kind: 'tool-approval-request'
      toolCallId: string
      toolName: string
      input: unknown
      prompt?: string
    }
  | { kind: 'tool-result'; toolCallId: string; toolName: string; output: unknown; isError?: boolean }
  | { kind: 'finish'; finishReason: string; usage: Usage }
  | { kind: 'aborted' }
  | { kind: 'error'; message: string }

export type { SessionUpdate, Usage }
