/**
 * chatStream 统一入口：按 provider 类型分发，输出归一化增量块
 */
import { fetch } from '@tauri-apps/plugin-http'

import { chatOllama } from '@/features/agent/model/ollama'
import { chatOpenAI } from '@/features/agent/model/openai'
import type { AgentToolDefinition, ChatMessage, NormalizedChunk, ProviderConfig } from '@/features/agent/types'

interface ChatParams {
  signal?: AbortSignal
  temperature?: number
  tools?: AgentToolDefinition[]
  toolChoice?: 'auto' | 'none' | 'required'
}

async function* chatStream(
  config: ProviderConfig,
  messages: ChatMessage[],
  params: ChatParams = {}
): AsyncGenerator<NormalizedChunk, void, unknown> {
  if (config.kind === 'ollama') {
    yield* chatOllama(config, messages, params)
    return
  }
  yield* chatOpenAI(config, messages, params)
}

/** 轻量连接测试：在线走 /models，Ollama 走 /api/version，5s 超时 */
async function testConnection(config: Pick<ProviderConfig, 'kind' | 'baseUrl' | 'apiKey'>) {
  const signal = AbortSignal.timeout(5000)
  if (config.kind === 'ollama') {
    const response = await fetch('/api/version', {
      method: 'GET',
      proxy: { all: { url: config.baseUrl } },
      signal
    })
    if (!response.ok) throw new Error(`连接失败: ${response.status}`)
    return
  }
  const response = await fetch(config.baseUrl.replace(/\/+$/, '') + '/models', {
    method: 'GET',
    headers: { Authorization: `Bearer ${config.apiKey ?? ''}` },
    signal
  })
  if (!response.ok) throw new Error(`连接失败: ${response.status}`)
}

export { chatStream, testConnection }
export type { ChatParams }
