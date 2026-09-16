import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@i-thinking/design/components/select'

import {
  CHAT_TRANSPORT_KINDS,
  CHAT_TRANSPORTS,
  resolveChatTransport,
  type ChatTransportKind
} from '@/features/chat/transport.ts'
import { useAgentStore } from '@/stores/agent.ts'

/**
 * 通路选择器：写进设置存储（`chat.transport`），切换后 `ChatRuntimeProvider` 因 `key` 变化重建。
 * 选中的通路不可用时回落（`resolveChatTransport`），并禁用对应选项。
 */
export function TransportSwitch() {
  const transport = useAgentStore(function (state) {
    return state.settings.chat.transport
  })
  const update = useAgentStore(function (state) {
    return state.update
  })

  function handleChange(value: string): void {
    void update('chat', { transport: value as ChatTransportKind })
  }

  return (
    <Select
      value={resolveChatTransport(transport)}
      onValueChange={handleChange}>
      <SelectTrigger
        className="h-8 w-auto px-2 text-xs"
        aria-label="对话通路">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CHAT_TRANSPORT_KINDS.map(function (kind) {
          const meta = CHAT_TRANSPORTS[kind]
          const isReady = meta.isReady()

          return (
            <SelectItem
              key={kind}
              value={kind}
              disabled={!isReady}
              title={isReady ? meta.hint : `${meta.hint}（当前不可用）`}>
              {meta.label}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
