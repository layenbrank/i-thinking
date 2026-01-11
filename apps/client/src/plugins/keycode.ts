import { emit } from '@tauri-apps/api/event'
import {
  getCurrentWebviewWindow,
  WebviewWindow
} from '@tauri-apps/api/webviewWindow'
import { register, unregister } from '@tauri-apps/plugin-global-shortcut'

import type { Plugin } from '@/components/provider/plugin.tsx'

import { dispatchKeyCode, registerKeyCodeHandler } from '@/keycodes/dispatcher'
import {
  loadKeyCodeBindings,
  subscribeKeyCodeBindingsChanged
} from '@/keycodes/store'
import type { KeyCodeBindings, KeyCodeID } from '@/keycodes/types'

let cleanupMainWindowShortcuts: (() => Promise<void>) | null = null

const KeyCodePlugin: Plugin = {
  unique: 'keycode-plugin',
  mount() {
    // 全局快捷键只能注册一次：如果截图窗口也注册同样的快捷键，会覆盖 main 窗口的 handler，
    // 关闭/热重载后就会出现“不再触发”或 callback id 警告。
    const currentWindow = getCurrentWebviewWindow()
    if (currentWindow.label !== 'main') return

    // 避免 Provider 重挂载导致的重复注册
    if (cleanupMainWindowShortcuts) return

    let registeredAccelerators: string[] = []
    let unsubscribeStoreChange: (() => void) | null = null
    const disposers: Array<() => void> = []
    let beforeUnloadHandler: (() => void) | null = null

    function addDefaultHandlers() {
      // Escape 的默认行为：如果截图窗口存在，则通知其 cleanup。
      // 其它页面/组件可以用更高 priority 的 handler 覆盖该行为。
      disposers.push(
        registerKeyCodeHandler(
          'escape',
          async () => {
            const existing = await WebviewWindow.getByLabel('screenshot')
            if (!existing) return false
            await emit('screenshot', 'cleanup')
            return true
          },
          { priority: -100 }
        )
      )
    }

    async function unregisterAllRegistered() {
      const toRemove = [...new Set(registeredAccelerators)]
      registeredAccelerators = []
      await Promise.all(toRemove.map((key) => unregister(key).catch(() => {})))
    }

    async function safeRegister(accelerator: string, id: KeyCodeID) {
      // 兜底：即使不是本次记录的 key，也尝试先解除，避免整页 reload/HMR 后残留。
      await unregister(accelerator).catch(() => {})
      try {
        await register(accelerator, (event) => {
          if (event.state !== 'Released') return
          void dispatchKeyCode(id)
        })
      } catch (error) {
        // 可能存在竞态：先 unregister 再 register 之间其它上下文注册了同一个 key
        await unregister(accelerator).catch(() => {})
        await register(accelerator, (event) => {
          if (event.state !== 'Released') return
          void dispatchKeyCode(id)
        })
      }
    }

    async function applyBindings(bindings: KeyCodeBindings) {
      await unregisterAllRegistered()

      const used = new Map<string, KeyCodeID>()
      const entries: Array<[KeyCodeID, string]> = [
        ['screenshot', bindings.screenshot],
        ['escape', bindings.escape]
      ]

      for (const [id, accelerator] of entries) {
        const key = accelerator.trim()
        if (!key) continue

        if (used.has(key)) {
          console.warn('[shortcuts] duplicated accelerator ignored', {
            accelerator: key,
            first: used.get(key),
            ignored: id
          })
          continue
        }
        used.set(key, id)
        registeredAccelerators.push(key)

        await safeRegister(key, id)
      }
    }

    async function bootstrap() {
      addDefaultHandlers()
      const bindings = await loadKeyCodeBindings()
      await applyBindings(bindings)

      unsubscribeStoreChange = subscribeKeyCodeBindingsChanged(() => {
        void loadKeyCodeBindings().then((next) => applyBindings(next))
      })
    }

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        void cleanupMainWindowShortcuts?.()
      })
    }

    cleanupMainWindowShortcuts = async () => {
      // 顺序：先取消监听，再卸载 handlers，最后 unregister。
      try {
        unsubscribeStoreChange?.()
        unsubscribeStoreChange = null

        if (beforeUnloadHandler) {
          window.removeEventListener('beforeunload', beforeUnloadHandler)
          beforeUnloadHandler = null
        }

        for (const dispose of disposers) dispose()
        disposers.length = 0

        await unregisterAllRegistered()
      } finally {
        cleanupMainWindowShortcuts = null
      }
    }

    beforeUnloadHandler = () => {
      void cleanupMainWindowShortcuts?.()
    }
    window.addEventListener('beforeunload', beforeUnloadHandler)

    void bootstrap()
  },
  unmount() {
    const currentWindow = getCurrentWebviewWindow()
    if (currentWindow.label !== 'main') return

    void cleanupMainWindowShortcuts?.()
  }
}

export { KeyCodePlugin }
