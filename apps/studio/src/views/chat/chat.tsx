import { ThreadList } from '@i-thinking/design/assistant/thread-list.aui'
import { Thread } from '@i-thinking/design/assistant/thread.aui'
import { Button } from '@i-thinking/design/components/button'
import { clsx } from 'clsx'
import { SettingsIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ModelPicker } from '@/features/chat/model-picker.tsx'
import { ProviderDialog } from '@/features/chat/provider/dialog.tsx'
import { ChatRuntimeProvider } from '@/features/chat/runtime.tsx'
import { TransportSwitch } from '@/features/chat/transport-switch.tsx'
import { resolveChatTransport } from '@/features/chat/transport.ts'
import { UsageLine } from '@/features/chat/usage-line.tsx'
import { useSettingsStore } from '@/stores/setting.ts'
import { toIpcMessage } from '@/utils/ipc.errors.ts'

import styles from '@/views/chat/chat.module.scss'

export default function Chat() {
  const [isProviderOpen, updateProviderOpen] = useState(false)
  const transport = useSettingsStore(function (state) {
    return state.settings.chat.transport
  })
  const loaded = useSettingsStore(function (state) {
    return state.loaded
  })
  const initialize = useSettingsStore(function (state) {
    return state.initialize
  })

  useEffect(
    function () {
      // 必须在失败时发声：本组件在 !loaded 时渲染 null，
      // initialize 静默失败会让 /chat 永远白屏而不是报错
      void initialize().catch(function (error) {
        toast.error(toIpcMessage(error, '设置读取失败'))
      })
    },
    [initialize]
  )

  // 通路来自持久化设置：读完再建 runtime，并随通路重建（切换 runtimeHook 会改变 hook 顺序）
  if (!loaded) return null

  const kind = resolveChatTransport(transport)

  return (
    <ChatRuntimeProvider
      key={kind}
      kind={kind}>
      <div className={clsx(styles.chat)}>
        <aside className={clsx(styles.sidebar)}>
          <header className={clsx(styles.sidebarHead)}>
            <span className={clsx(styles.sidebarTitle)}>对话</span>
            <div className={clsx(styles.sidebarActions)}>
              <TransportSwitch />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Provider 设置"
                onClick={function () {
                  updateProviderOpen(true)
                }}>
                <SettingsIcon />
              </Button>
            </div>
          </header>
          <ModelPicker />
          <ThreadList />
        </aside>
        <main className={clsx(styles.thread)}>
          <div className={clsx(styles.threadBody)}>
            <Thread />
          </div>
          <UsageLine />
        </main>
      </div>

      <ProviderDialog
        open={isProviderOpen}
        onOpenChange={updateProviderOpen}
      />
    </ChatRuntimeProvider>
  )
}
