import { createOnlineTransport } from '@i-thinking/chat/adapters/online-transport'
import type { AssistantChatTransport } from '@assistant-ui/ai-sdk'
import type { UIMessage } from 'ai'

import { findAuthToken } from '@/utils/auth.ts'

/**
 * 通路选择（表驱动）：离线 = 主进程本地 provider（MessagePort），在线 = Thinking 服务。
 * 新增通路只需加一条表项 + 一个 runtime hook（见 `runtime.tsx` 的 `RUNTIME_HOOKS`）。
 *
 * 服务地址来自 `VITE_THINKING`（含 URI 版本前缀），未配置或未登录时在线通路不可用。
 */

export type ChatTransportKind = 'offline' | 'online'

type TransportMeta = {
  label: string
  hint: string
  /** 是否可用：离线始终可用，在线需要服务地址 + 登录态 */
  isReady: () => boolean
}

export function findChatEndpoint(): string | null {
  const base = (import.meta.env.VITE_THINKING ?? '').trim()
  return base ? `${base.replace(/\/+$/, '')}/chat` : null
}

export const CHAT_TRANSPORTS: Record<ChatTransportKind, TransportMeta> = {
  offline: {
    label: '本地 provider',
    hint: '主进程直连本机模型，密钥不出主进程',
    isReady: function () {
      return true
    }
  },
  online: {
    label: '在线服务',
    hint: '经 Thinking 服务转发，使用当前登录令牌',
    isReady: function () {
      return Boolean(findChatEndpoint() && findAuthToken())
    }
  }
}

export const CHAT_TRANSPORT_KINDS = Object.keys(CHAT_TRANSPORTS) as ChatTransportKind[]

export const DEFAULT_CHAT_TRANSPORT: ChatTransportKind = 'offline'

/** 校验持久化值（脏数据回落到默认） */
export function parseChatTransport(value: unknown): ChatTransportKind {
  return (
    CHAT_TRANSPORT_KINDS.find(function (item) {
      return item === value
    }) ?? DEFAULT_CHAT_TRANSPORT
  )
}

/** 实际生效的通路：选中的通路不可用（如未登录）时回落 */
export function resolveChatTransport(value: unknown): ChatTransportKind {
  const kind = parseChatTransport(value)
  return CHAT_TRANSPORTS[kind].isReady() ? kind : DEFAULT_CHAT_TRANSPORT
}

/**
 * 在线通路的传输层（自己解析 UI message 流）；离线通路用 `useLocalRuntime`，返回 null。
 * 模型读取器由调用方传入（避免设置存储与特性模块互相 import）。
 */
export function buildOnlineChatTransport(
  findModel: () => string
): AssistantChatTransport<UIMessage> | null {
  const url = findChatEndpoint()
  if (!url || !findAuthToken()) return null

  return createOnlineTransport({ url, findToken: findAuthToken, findModel })
}
