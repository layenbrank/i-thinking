import type {
  ChatModelPort,
  ChatRunMessage,
  ChatStreamEvent,
  ChatTarget,
  ChatUsage
} from '@i-thinking/chat/ports'

import { findGatewayChatEndpoint } from '@/features/chat/transport.ts'
import { findAuthToken } from '@/utils/auth.ts'
import { SUCCESS_CODE } from '@/utils/http.errors.ts'

/**
 * 在线通路模型端口：直连 rust-service `POST /gateway/chat/completions`（OpenAI SSE）。
 *
 * 与离线 MessagePort 并列，都产出 `ChatStreamEvent`，由同一套 `chat-model` 适配器消费。
 * 在线 V1 只走文本 / 推理增量（工具仍在离线通路）。
 */

const GATEWAY_PROVIDER_ID = 'gateway'
const TEXT_BLOCK_ID = 'gateway-text'
const REASONING_BLOCK_ID = 'gateway-reasoning'

interface ModelSelection {
  model: string
}

interface WireMessage {
  role: string
  content: string
}

interface SseChunk {
  choices?: Array<{
    finish_reason?: string | null
    delta?: {
      content?: string | null
      reasoning_content?: string | null
      reasoning?: string | null
    }
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  /** 业务信封失败时可能整包 JSON */
  code?: number
  msg?: string
  success?: boolean
}

function toWireMessages(system: string | undefined, messages: ChatRunMessage[]): WireMessage[] {
  const wire: WireMessage[] = []
  if (system?.trim()) {
    wire.push({ role: 'system', content: system.trim() })
  }
  for (const message of messages) {
    wire.push({ role: message.role, content: message.content })
  }
  return wire
}

function toUsage(raw: SseChunk['usage']): ChatUsage {
  return {
    ...(raw?.prompt_tokens === undefined ? {} : { inputTokens: raw.prompt_tokens }),
    ...(raw?.completion_tokens === undefined ? {} : { outputTokens: raw.completion_tokens }),
    ...(raw?.total_tokens === undefined ? {} : { totalTokens: raw.total_tokens })
  }
}

/** 逐条产出 SSE `data:` 载荷（已剥掉前缀，`[DONE]` 跳过） */
async function* readSseData(
  response: Response,
  signal: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const body = response.body
  if (!body) throw new Error('网关响应无 body')

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal.aborted) {
        await reader.cancel().catch(function () {})
        return
      }
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let newline = buffer.indexOf('\n')
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        newline = buffer.indexOf('\n')

        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload && payload !== '[DONE]') yield payload
      }
    }
  } finally {
    reader.releaseLock()
  }
}

async function findErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(function () {
    return ''
  })
  if (!text) return `网关请求失败 (${response.status})`

  try {
    const parsed = JSON.parse(text) as SseChunk
    if (typeof parsed.msg === 'string' && parsed.msg) return parsed.msg
    if (typeof parsed.code === 'number' && parsed.code !== SUCCESS_CODE) {
      return `网关错误 ${parsed.code}`
    }
  } catch {
    // 非 JSON：截断原文
  }
  return text.slice(0, 500)
}

function createGatewayModelPort(findSelection: () => ModelSelection): ChatModelPort {
  return {
    async findTarget(): Promise<ChatTarget | null> {
      const model = findSelection().model.trim()
      return model ? { providerID: GATEWAY_PROVIDER_ID, model } : null
    },

    async *run(input, signal): AsyncGenerator<ChatStreamEvent, void, unknown> {
      const url = findGatewayChatEndpoint()
      const token = findAuthToken()
      if (!url) {
        yield { kind: 'error', message: '未配置服务地址（VITE_THINKING）' }
        return
      }
      if (!token) {
        yield { kind: 'error', message: '尚未登录，无法使用在线模型' }
        return
      }

      let response: Response
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            model: input.model,
            stream: true,
            messages: toWireMessages(input.system, input.messages)
          }),
          signal
        })
      } catch (error) {
        if (signal.aborted) {
          yield { kind: 'aborted' }
          return
        }
        yield {
          kind: 'error',
          message: error instanceof Error ? error.message : '网关请求失败'
        }
        return
      }

      const contentType = response.headers.get('content-type') ?? ''
      const isEventStream = contentType.includes('text/event-stream')

      if (!response.ok || !isEventStream) {
        yield { kind: 'error', message: await findErrorMessage(response) }
        return
      }

      let finishReason = ''
      let usage: ChatUsage = {}

      try {
        for await (const payload of readSseData(response, signal)) {
          if (signal.aborted) {
            yield { kind: 'aborted' }
            return
          }

          let chunk: SseChunk
          try {
            chunk = JSON.parse(payload) as SseChunk
          } catch {
            continue
          }

          // 偶发把业务信封塞进 SSE 行
          if (typeof chunk.code === 'number' && chunk.code !== SUCCESS_CODE) {
            yield { kind: 'error', message: chunk.msg || `网关错误 ${chunk.code}` }
            return
          }

          const choice = chunk.choices?.[0]
          const delta = choice?.delta
          if (delta?.content) {
            yield { kind: 'text', blockID: TEXT_BLOCK_ID, text: delta.content }
          }
          const reasoning = delta?.reasoning_content ?? delta?.reasoning
          if (reasoning) {
            yield { kind: 'reasoning', blockID: REASONING_BLOCK_ID, text: reasoning }
          }
          if (choice?.finish_reason) finishReason = choice.finish_reason
          if (chunk.usage) usage = toUsage(chunk.usage)
        }
      } catch (error) {
        if (signal.aborted) {
          yield { kind: 'aborted' }
          return
        }
        yield {
          kind: 'error',
          message: error instanceof Error ? error.message : '读取网关流失败'
        }
        return
      }

      if (signal.aborted) {
        yield { kind: 'aborted' }
        return
      }

      yield { kind: 'finish', finishReason: finishReason || 'stop', usage }
    }
  }
}

export { GATEWAY_PROVIDER_ID, createGatewayModelPort }
