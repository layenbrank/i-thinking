import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@i-thinking/ui/components/ui/select'
import { clsx } from 'clsx'

import {
  CHAT_TRANSPORT_KINDS,
  CHAT_TRANSPORTS,
  resolveChatTransport,
  type ChatTransportKind
} from '@/features/chat/transport.ts'
import { useSettingsStore } from '@/stores/setting.ts'

import styles from '@/views/chat/chat.module.scss'

/**
 * 通路选择器：写进设置存储（`chat.transport`），切换后 `ChatRuntimeProvider` 因 `key` 变化重建。
 * 选中的通路不可用时回落（`resolveChatTransport`），并禁用对应选项。
 */
export function TransportSwitch() {
  const transport = useSettingsStore(function (state) {
    return state.settings.chat.transport
  })
  const update = useSettingsStore(function (state) {
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
        className={clsx(styles.transportTrigger)}
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
