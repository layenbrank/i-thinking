import { findAuthToken } from '@/utils/auth.ts'

/**
 * 通路选择（表驱动）：
 * - 离线 = 主进程本地 provider（MessagePort + BYOK）
 * - 在线 = rust-service gateway（`/gateway/chat/completions` + `/gateway/models`）
 *
 * 服务地址来自 `VITE_THINKING`（含 URI 版本前缀，如 `…/api/v1`），未配置或未登录时在线通路不可用。
 */

export type ChatTransportKind = 'offline' | 'online'

type TransportMeta = {
  label: string
  hint: string
  /** 是否可用：离线始终可用，在线需要服务地址 + 登录态 */
  isReady: () => boolean
}

/** Thinking / rust-service 的 API 根（已去尾斜杠）；未配置返回 null */
export function findThinkingBase(): string | null {
  const base = (import.meta.env.VITE_THINKING ?? '').trim()
  return base ? base.replace(/\/+$/, '') : null
}

/** 在线对话：OpenAI 兼容转发 */
export function findGatewayChatEndpoint(): string | null {
  const base = findThinkingBase()
  return base ? `${base}/gateway/chat/completions` : null
}

/** 在线模型目录 */
export function findGatewayModelsEndpoint(): string | null {
  const base = findThinkingBase()
  return base ? `${base}/gateway/models` : null
}

/**
 * @deprecated 旧 Nest `/chat`（UI message 流）已由 gateway 取代；保留别名以免外部误用。
 */
export function findChatEndpoint(): string | null {
  return findGatewayChatEndpoint()
}

export const CHAT_TRANSPORTS: Record<ChatTransportKind, TransportMeta> = {
  offline: {
    label: '本地 provider',
    hint: '主进程直连本机 / BYOK 云端点，密钥不出主进程',
    isReady: function () {
      return true
    }
  },
  online: {
    label: '在线服务',
    hint: '经 rust-service gateway 转发，使用当前登录令牌与服务端模型目录',
    isReady: function () {
      return Boolean(findGatewayChatEndpoint() && findAuthToken())
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
