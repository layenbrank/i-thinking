/**
 * Ollama 本地接入（NDJSON 流 + tools）
 */
import { fetch } from '@tauri-apps/plugin-http'

import { OLLAMA_BASE_URL } from '@/features/agent/model/providers'
import { serializeMessages } from '@/features/agent/model/openai'
import type {
  AgentToolDefinition,
  ChatMessage,
  NormalizedChunk,
  ProviderConfig,
  ToolCallDelta
} from '@/features/agent/types'
import { GeneratorJSON } from '@/utils/http/stream.ts'

interface OllamaToolCall {
  function?: {
    name?: string
    arguments?: Record<string, unknown> | string
  }
  id?: string
}

interface OllamaMessage {
  role: string
  content?: string
  thinking?: string
  tool_calls?: OllamaToolCall[]
}

interface OllamaChunk {
  model: string
  created_at: string
  message?: OllamaMessage
  done: boolean
  done_reason?: string
}

interface OllamaModel {
  name: string
}

interface ChatParams {
  signal?: AbortSignal
  temperature?: number
  tools?: AgentToolDefinition[]
  toolChoice?: 'auto' | 'none' | 'required'
}

function buildSignal(signal?: AbortSignal) {
  const timeoutSignal = AbortSignal.timeout(1000 * 60 * 10)
  if (!signal) return timeoutSignal
  return typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeoutSignal]) : signal
}

function parseOllamaToolCalls(raw: OllamaToolCall[] | undefined): ToolCallDelta[] | undefined {
  if (!raw?.length) return undefined
  return raw.map(function (item, index) {
    const args = item.function?.arguments
    const argsText =
      typeof args === 'string' ? args : args ? JSON.stringify(args) : ''
    return {
      index,
      id: item.id || `ollama-tool-${index}`,
      name: item.function?.name,
      arguments: argsText
    }
  })
}

async function* chatOllama(
  config: ProviderConfig,
  messages: ChatMessage[],
  params: ChatParams = {}
): AsyncGenerator<NormalizedChunk, void, unknown> {
  const body: Record<string, unknown> = {
    model: config.model,
    stream: true,
    options: {
      temperature: params.temperature
    },
    messages: serializeMessages(messages)
  }
  if (params.tools?.length) {
    body.tools = params.tools
  }

  const fetcher = function () {
    return fetch(`/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson'
      },
      proxy: {
        all: {
          url: config.baseUrl || OLLAMA_BASE_URL
        }
      },
      signal: buildSignal(params.signal),
      body: JSON.stringify(body)
    })
  }

  for await (const chunk of GeneratorJSON<typeof fetcher, OllamaChunk>(fetcher)) {
    yield {
      content: chunk.message?.content,
      thinking: chunk.message?.thinking,
      // Ollama 常在结束帧带完整 tool_calls，避免流中重复拼接
      toolCalls: chunk.done ? parseOllamaToolCalls(chunk.message?.tool_calls) : undefined,
      finishReason: chunk.done ? chunk.done_reason || 'stop' : null,
      done: chunk.done
    }
    if (chunk.done) return
  }
  yield { done: true }
}

/** 拉取本地已安装模型列表 */
async function fetchOllamaModels(baseUrl: string, signal?: AbortSignal): Promise<string[]> {
  const response = await fetch(`/api/tags`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    proxy: {
      all: {
        url: baseUrl || OLLAMA_BASE_URL
      }
    },
    signal: signal ?? AbortSignal.timeout(5000)
  })
  if (!response.ok) throw new Error(`Ollama /api/tags 失败: ${response.status}`)
  const body = (await response.json()) as { models?: OllamaModel[] }
  return (body.models ?? []).map(function (model) {
    return model.name
  })
}

export { chatOllama, fetchOllamaModels }
export type { ChatParams }
