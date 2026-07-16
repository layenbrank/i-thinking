import { XProvider } from '@ant-design/x'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { message } from 'antd'
import zhCN from 'antd/locale/zh_CN'

import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import localeData from 'dayjs/plugin/localeData'

import { Suspense, useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'

import { Fallback } from '@/components/fallback/index.ts'
import { PluginProvider, type Plugin } from '@/components/provider/plugin.tsx'
import { IntelligencePlugin } from '@/plugins/intelligence.ts'
import { StoragePlugin } from '@/plugins/storage.ts'
import { router } from '@/routers/index'
import { useMirrorStore } from '@/stores/mirror.ts'
import { useSettingsStore } from '@/stores/setting.ts'
import { useProviderProps } from '@/themes'

dayjs.extend(localeData)
dayjs.locale('zh-cn')

const plugins: Plugin[] = [
  {
    ...StoragePlugin,
    priority: 10
  },
  IntelligencePlugin
]
const SCREENSHOT_SHORTCUT = 'CommandOrControl+Alt+A'

function App() {
  const provider = useProviderProps()

  useEffect(function () {
    void useMirrorStore.getState().toInitialize()
    void useSettingsStore.getState().initialize()
  }, [])

  useEffect(function () {
    let unlisten: (() => void) | undefined
    let warned = false

    function warn() {
      if (warned) return
      warned = true
      message.warning('corex 未就绪，PDF / 截图等功能暂不可用。请构建 corex-serve 后重启应用。', 8)
    }

    async function bootstrap() {
      try {
        unlisten = await listen('corex://not-ready', warn)
        // null = pending（启动中），不告警；false = settled 且失败
        const ready = await invoke<boolean | null>('ipc:ready')
        if (ready === false) warn()
      } catch (err) {
        console.warn('[App] corex 状态检查失败', err)
      }
    }

    void bootstrap()

    return function () {
      unlisten?.()
    }
  }, [])

  useEffect(function () {
    let cleanup: (() => void) | null = null
    let cancelled = false

    async function bootstrap() {
      try {
        if (await isRegistered(SCREENSHOT_SHORTCUT)) await unregister(SCREENSHOT_SHORTCUT)
        await register(SCREENSHOT_SHORTCUT, function (event) {
          if (event.state === 'Pressed') void invoke('screenshot:open')
        })
        if (cancelled) await unregister(SCREENSHOT_SHORTCUT)
        else {
          cleanup = function () {
            void unregister(SCREENSHOT_SHORTCUT)
          }
        }
      } catch (err) {
        console.warn('[App] 注册截图快捷键失败', err)
      }
    }

    void bootstrap()

    return function () {
      cancelled = true
      cleanup?.()
    }
  }, [])

  function onPluginError(plugin: Plugin, error: unknown) {
    console.error(`plugin error "${plugin.unique}"`, error)
  }

  return (
    <PluginProvider
      plugins={plugins}
      onError={onPluginError}>
      <XProvider
        locale={zhCN}
        {...provider}>
        <Suspense fallback={<Fallback.Route />}>
          <RouterProvider router={router} />
        </Suspense>
      </XProvider>
    </PluginProvider>
  )
}

export default App
