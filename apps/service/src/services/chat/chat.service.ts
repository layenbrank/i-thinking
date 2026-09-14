import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import type { ServerResponse } from 'node:http'

interface StreamInput {
  messages: UIMessage[]
  model?: string
  system?: string
}

/** env 键集中在这里，避免字符串散落 */
const ENV = {
  BASE_URL: 'AI_BASE_URL',
  API_KEY: 'AI_API_KEY',
  MODEL: 'AI_MODEL',
  PROVIDER_NAME: 'AI_PROVIDER_NAME'
} as const

const DEFAULT_PROVIDER_NAME = 'service'

/**
 * 在线通路：服务端发模型请求并把 **AI SDK v7 的 UI 消息流** 直接写进响应。
 *
 * 与离线通路的关系：同一个模型生态（OpenAI 兼容端点），区别只在谁拿 Key、谁持有连接 ——
 * 离线时是 Electron 主进程（safeStorage + MessagePort），在线时是本服务（env + HTTP）。
 * 因此模型/provider 的**选择权仍在客户端**（`model` 字段），服务端只提供默认值。
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)

  constructor(private readonly config: ConfigService<NodeJS.ProcessEnv>) {}

  async stream(input: StreamInput, response: ServerResponse): Promise<void> {
    const modelID = input.model ?? this.findEnv(ENV.MODEL)
    if (!modelID) throw new ServiceUnavailableException(`未配置 ${ENV.MODEL}`)

    const model = this.buildProvider().chatModel(modelID)
    const messages = await convertToModelMessages(input.messages)

    const result = streamText({
      model,
      messages,
      ...(input.system ? { system: input.system } : {})
    })

    // 写进原始响应：全局 ResponseInterceptor 的 {code,data,msg} 包裹会破坏 SSE 流，
    // 控制器因此用 @Res() 直写（Nest 不再接管返回值）。
    await result.pipeUIMessageStreamToResponse(response)
    this.logger.log(`stream finished: model=${modelID}, messages=${messages.length}`)
  }

  private findEnv(key: (typeof ENV)[keyof typeof ENV]): string | undefined {
    return this.config.get<string>(key, { infer: true })
  }

  private buildProvider(): ReturnType<typeof createOpenAICompatible> {
    const baseURL = this.findEnv(ENV.BASE_URL)
    if (!baseURL) throw new ServiceUnavailableException(`未配置 ${ENV.BASE_URL}`)

    const apiKey = this.findEnv(ENV.API_KEY)
    return createOpenAICompatible({
      name: this.findEnv(ENV.PROVIDER_NAME) ?? DEFAULT_PROVIDER_NAME,
      baseURL,
      ...(apiKey ? { apiKey } : {})
    })
  }
}
