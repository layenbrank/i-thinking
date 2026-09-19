/**
 * 模型流抽象：把一次补全请求变成增量流。
 *
 * 循环（`loop.ts`）只依赖这个接口，不关心具体供应商；供应商客户端
 * （`client/openai-compatible.ts`、后续 `client/anthropic.ts`）各自实现
 * 到 `ModelDelta` 的转换。文本/推理逐 token 下发，工具调用完成后整块下发，最后 finish。
 */

import type { Usage } from './events'
import type { Message } from './message'
import type { Provider } from './provider'
import type { Tool } from './tool'

type ModelDelta =
  | { kind: 'text'; text: string }
  | { kind: 'reasoning'; text: string }
  | { kind: 'tool-call'; toolCallId: string; toolName: string; input: unknown }
  | { kind: 'finish'; finishReason: string; usage?: Usage }

interface ModelStreamRequest {
  provider: Provider
  /** BYOK 密钥（由宿主 SecretStore 注入，不落库） */
  apiKey?: string
  /** 模型名（provider 内） */
  model: string
  system?: string
  messages: Message[]
  tools: Tool[]
  signal?: AbortSignal
}

interface ModelStream {
  stream(request: ModelStreamRequest): AsyncIterable<ModelDelta>
}

export type { ModelDelta, ModelStream, ModelStreamRequest }
