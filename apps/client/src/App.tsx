import { XProvider } from '@ant-design/x'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { message, App as AntApp } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import { MotionConfig } from 'motion/react'
import zhCN from 'antd/locale/zh_CN'

import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import localeData from 'dayjs/plugin/localeData'

import { Suspense, useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'

import { QueryProvider } from '@/components/provider/query'
import { Fallback } from '@/components/fallback/index.ts'
import { PluginProvider, type Plugin } from '@/components/provider/plugin.tsx'
import { IntelligencePlugin } from '@/plugins/intelligence.ts'
import { StoragePlugin } from '@/plugins/storage.ts'
import { router } from '@/routers/index'
import { useMirrorStore } from '@/stores/mirror.ts'
import { useSettingsStore } from '@/stores/setting.ts'
import { useProviderProps } from '@/themes'
import { applyCliMatches } from '@/utils/cli'
import { checkUpdate } from '@/utils/updater'

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
const COREX_NOT_READY = 'corex 未就绪，PDF / 截图等功能暂不可用。请构建 corex-serve 后重启应用。'

function App() {
  const provider = useProviderProps()

  useEffect(function () {
    void useMirrorStore.getState().toInitialize()
    void useSettingsStore.getState().initialize()
  }, [])

  useEffect(function () {
    if (!import.meta.env.DEV) return

    let detach: (() => void) | undefined
    let cancelled = false

    async function attach() {
      try {
        const { attachConsole } = await import('@tauri-apps/plugin-log')
        const detachConsole = await attachConsole()
        if (cancelled) detachConsole()
        else detach = detachConsole
      } catch (err) {
        console.warn('[App] attachConsole failed', err)
      }
    }

    void attach()
    return function () {
      cancelled = true
      detach?.()
    }
  }, [])

  useEffect(function () {
    void applyCliMatches()
  }, [])

  useEffect(function () {
    let unlisten: (() => void) | undefined
    let cancelled = false

    async function bootstrap() {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        if (getCurrentWindow().label !== 'main') return

        unlisten = await listen<string>('tray:action', function (event) {
          if (event.payload === 'check-update') {
            void checkUpdate()
          }
        })
        if (cancelled) unlisten()
      } catch (err) {
        console.warn('[App] tray:action listen failed', err)
      }
    }

    void bootstrap()
    return function () {
      cancelled = true
      unlisten?.()
    }
  }, [])

  useEffect(function () {
    let unlisten: (() => void) | undefined
    let cancelled = false

    async function bootstrap() {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        if (getCurrentWindow().label !== 'main') return

        const { listen } = await import('@tauri-apps/api/event')
        const { showMagneticTileOverlay } = await import('@/features/magnetic-tile/overlay-registry')
        unlisten = await listen<{ magneticTileID: string }>(
          'magnetic-tile://show-overlay',
          function (event) {
            const id = event.payload?.magneticTileID
            if (id) showMagneticTileOverlay(id)
          }
        )
        if (cancelled) unlisten()
      } catch (err) {
        console.warn('[App] magnetic-tile://show-overlay listen failed', err)
      }
    }

    void bootstrap()
    return function () {
      cancelled = true
      unlisten?.()
    }
  }, [])

  useEffect(function () {
    let unlisten: (() => void) | undefined
    let disposed = false
    let warned = false

    function warn() {
      if (disposed || warned) return
      warned = true
      message.warning(COREX_NOT_READY, 8)
    }

    async function bootstrap() {
      try {
        // 生命周期事件：仅在后端确认失败时触发
        unlisten = await listen('corex://not-ready', warn)
        // null = 启动中（等事件）；false = 已失败；true = 已就绪
        const ready = await invoke<boolean | null>('ipc:ready')
        if (ready === false) warn()
      } catch (err) {
        console.warn('[App] corex 状态检查失败', err)
      }
    }

    void bootstrap()

    return function () {
      disposed = true
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
    <MotionConfig reducedMotion="user">
      <StyleProvider hashPriority="low">
        <XProvider
          locale={zhCN}
          {...provider}>
          <AntApp
            message={{ maxCount: 3 }}
            notification={{ maxCount: 1 }}>
            <QueryProvider>
              <PluginProvider
                plugins={plugins}
                onError={onPluginError}>
                <Suspense fallback={<Fallback.Route />}>
                  <RouterProvider router={router} />
                </Suspense>
              </PluginProvider>
            </QueryProvider>
          </AntApp>
        </XProvider>
      </StyleProvider>
    </MotionConfig>
  )
}

export default App
