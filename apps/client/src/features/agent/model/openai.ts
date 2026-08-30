/**
 * OpenAI 兼容接入（SSE 流 + tools / tool_calls）
 */
import { fetch } from '@tauri-apps/plugin-http'

import type {
  AgentToolDefinition,
  ChatMessage,
  ChatToolCall,
  NormalizedChunk,
  ProviderConfig,
  ToolCallDelta
} from '@/features/agent/types'
import { GeneratorSSE } from '@/utils/http/stream.ts'

interface OpenAIToolCallDelta {
  index?: number
  id?: string
  type?: string
  function?: { name?: string; arguments?: string }
}

interface OpenAIDelta {
  role?: string
  content?: string | null
  reasoning_content?: string | null
  tool_calls?: OpenAIToolCallDelta[]
}

interface OpenAIChunk {
  choices?: {
    delta?: OpenAIDelta
    finish_reason?: string | null
  }[]
}

interface ChatParams {
  signal?: AbortSignal
  temperature?: number
  tools?: AgentToolDefinition[]
  toolChoice?: 'auto' | 'none' | 'required'
}

function joinUrl(baseUrl: string, path: string) {
  return baseUrl.replace(/\/+$/, '') + path
}

function buildSignal(signal?: AbortSignal) {
  const timeoutSignal = AbortSignal.timeout(1000 * 60 * 10)
  if (!signal) return timeoutSignal
  return typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeoutSignal]) : signal
}

function serializeMessages(messages: ChatMessage[]) {
  return messages.map(function (message) {
    const row: Record<string, unknown> = {
      role: message.role,
      content: message.content
    }
    if (message.tool_calls?.length) row.tool_calls = message.tool_calls
    if (message.tool_call_id) row.tool_call_id = message.tool_call_id
    if (message.name) row.name = message.name
    return row
  })
}

function parseToolCallDeltas(raw: OpenAIToolCallDelta[] | undefined): ToolCallDelta[] | undefined {
  if (!raw?.length) return undefined
  return raw.map(function (item) {
    return {
      index: item.index ?? 0,
      id: item.id,
      name: item.function?.name,
      arguments: item.function?.arguments
    }
  })
}

/** 将流式 tool_calls 增量合并为完整 ChatToolCall[] */
function mergeToolCallDeltas(deltas: ToolCallDelta[]) {
  const byIndex = new Map<number, ChatToolCall>()
  deltas.forEach(function (delta) {
    const current = byIndex.get(delta.index) ?? {
      id: '',
      type: 'function' as const,
      function: { name: '', arguments: '' }
    }
    if (delta.id) current.id = delta.id
    if (delta.name) current.function.name += delta.name
    if (delta.arguments) current.function.arguments += delta.arguments
    byIndex.set(delta.index, current)
  })
  return [...byIndex.entries()]
    .sort(function (a, b) {
      return a[0] - b[0]
    })
    .map(function (entry) {
      return entry[1]
    })
    .filter(function (item) {
      return Boolean(item.id && item.function.name)
    })
}

async function* chatOpenAI(
  config: ProviderConfig,
  messages: ChatMessage[],
  params: ChatParams = {}
): AsyncGenerator<NormalizedChunk, void, unknown> {
  const body: Record<string, unknown> = {
    model: config.model,
    stream: true,
    temperature: params.temperature,
    messages: serializeMessages(messages)
  }
  if (params.tools?.length) {
    body.tools = params.tools
    body.tool_choice = params.toolChoice ?? 'auto'
  }

  const fetcher = function () {
    return fetch(joinUrl(config.baseUrl, '/chat/completions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${config.apiKey ?? ''}`
      },
      signal: buildSignal(params.signal),
      body: JSON.stringify(body)
    })
  }

  for await (const chunk of GeneratorSSE<typeof fetcher, OpenAIChunk>(fetcher)) {
    const choice = chunk.choices?.[0]
    const delta = choice?.delta
    if (!delta && !choice?.finish_reason) continue
    yield {
      content: delta?.content ?? undefined,
      thinking: delta?.reasoning_content ?? undefined,
      toolCalls: parseToolCallDeltas(delta?.tool_calls),
      finishReason: choice?.finish_reason
    }
  }
  yield { done: true }
}

export { chatOpenAI, mergeToolCallDeltas, serializeMessages }
export type { ChatParams }
