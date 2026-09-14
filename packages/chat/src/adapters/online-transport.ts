import { AssistantChatTransport } from '@assistant-ui/ai-sdk'
import type { UIMessage } from 'ai'

/**
 * 在线通路：把请求交给 assistant-ui 的 AI SDK 传输层（它自己解析 UI message 流），
 * 与离线通路的 `ChatModelPort` 并列，由各 app 按登录/网络状况选择。
 *
 * token 用函数形式读取：登录态变化后不需要重建 transport。
 */

/** 在线目标：service 的 chat 路由 + token / 模型读取器 */
export type OnlineTarget = {
  url: string
  findToken?: () => string | null
  /** 模型覆盖（空值表示用服务端 `AI_MODEL`） */
  findModel?: () => string
}

/** 构造 `Authorization` 头；无 token 时返回空对象（本机部署可能不校验） */
export function buildAuthHeaders(findToken: () => string | null): Record<string, string> {
  const token = findToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** 构造附加 body：只有选了模型才带上，否则用服务端默认 */
export function buildModelBody(findModel: () => string): object {
  const model = findModel().trim()
  return model ? { model } : {}
}

export function createOnlineTransport(target: OnlineTarget): AssistantChatTransport<UIMessage> {
  const { url, findToken, findModel } = target

  return new AssistantChatTransport({
    api: url,
    ...(findToken
      ? {
          headers: function () {
            return buildAuthHeaders(findToken)
          }
        }
      : {}),
    ...(findModel
      ? {
          body: function () {
            return buildModelBody(findModel)
          }
        }
      : {})
  })
}
