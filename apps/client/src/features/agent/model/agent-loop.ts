/**
 * Agent 多轮 tool-calling 循环（无 tools 时退化为单轮流式）
 */
import { chatStream } from '@/features/agent/model/chat'
import {
  AGENT_TOOL_DEFINITIONS,
  executeAgentTool,
  type AgentToolContext
} from '@/features/agent/model/agent-tools'
import { mergeToolCallDeltas } from '@/features/agent/model/openai'
import type {
  ChatMessage,
  ProviderConfig,
  ToolCallDelta,
  ToolCallRequest,
  ToolPart
} from '@/features/agent/types'

const MAX_TOOL_ROUNDS = 8

interface AgentLoopParams {
  config: ProviderConfig
  messages: ChatMessage[]
  context: AgentToolContext
  enableTools?: boolean
  signal?: AbortSignal
  temperature?: number
  onTextDelta?: (content: string, thinking: string) => void
  onToolPart?: (part: ToolPart) => void
}

interface AgentLoopResult {
  fragment: string
  thinking: string
  toolParts: ToolPart[]
  rounds: number
}

function accumulateToolDeltas(store: ToolCallDelta[], incoming: ToolCallDelta[] | undefined) {
  if (!incoming?.length) return
  incoming.forEach(function (delta) {
    store.push(delta)
  })
}

async function runAgentLoop(params: AgentLoopParams): Promise<AgentLoopResult> {
  const transfer = params.messages.slice()
  let fragment = ''
  let thinking = ''
  const toolParts: ToolPart[] = []
  let rounds = 0
  const enableTools = Boolean(params.enableTools)

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds += 1
    const toolDeltas: ToolCallDelta[] = []
    let roundContent = ''
    let roundThinking = ''

    const stream = chatStream(params.config, transfer, {
      signal: params.signal,
      temperature: params.temperature,
      tools: enableTools ? AGENT_TOOL_DEFINITIONS : undefined,
      toolChoice: enableTools ? 'auto' : undefined
    })

    for await (const chunk of stream) {
      if (params.signal?.aborted) break
      if (chunk.content) {
        roundContent += chunk.content
        fragment += chunk.content
      }
      if (chunk.thinking) {
        roundThinking += chunk.thinking
        thinking += chunk.thinking
      }
      if (enableTools) accumulateToolDeltas(toolDeltas, chunk.toolCalls)
      params.onTextDelta?.(fragment, thinking)
    }

    if (params.signal?.aborted) break
    if (!enableTools) break

    const toolCalls = mergeToolCallDeltas(toolDeltas)
    if (!toolCalls.length) break

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: roundContent || null,
      thinking: roundThinking || undefined,
      tool_calls: toolCalls
    }
    transfer.push(assistantMessage)

    for (const call of toolCalls) {
      if (params.signal?.aborted) break
      const request: ToolCallRequest = {
        id: call.id,
        name: call.function.name,
        arguments: call.function.arguments
      }
      const running: ToolPart = {
        type: 'tool',
        data: {
          toolCallId: call.id,
          name: call.function.name,
          arguments: call.function.arguments,
          status: 'running'
        }
      }
      toolParts.push(running)
      params.onToolPart?.(running)

      const result = await executeAgentTool(request, params.context)
      if (params.signal?.aborted) break
      const done: ToolPart = {
        type: 'tool',
        data: {
          toolCallId: call.id,
          name: call.function.name,
          arguments: call.function.arguments,
          result: result.content.slice(0, 2000),
          status: result.isError ? 'error' : 'done'
        }
      }
      toolParts[toolParts.length - 1] = done
      params.onToolPart?.(done)

      transfer.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: result.content
      })
    }
  }

  return { fragment, thinking, toolParts, rounds }
}

export { MAX_TOOL_ROUNDS, runAgentLoop }
export type { AgentLoopParams, AgentLoopResult }
