import { XProvider } from '@ant-design/x'
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
  { ...StoragePlugin, priority: 10 },
  IntelligencePlugin
]

function App() {
  const provider = useProviderProps()

  useEffect(function () {
    void useMirrorStore.getState().toInitialize()
    void useSettingsStore.getState().initialize()
  }, [])

  useEffect(function () {
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return

    let unlisten: (() => void) | undefined

    ;(async function () {
      try {
        const [{ listen }, { invoke }, { message }] = await Promise.all([
          import('@tauri-apps/api/event'),
          import('@tauri-apps/api/core'),
          import('antd')
        ])

        function warn() {
          message.warning(
            'corex 未就绪，PDF / 截图等功能暂不可用。请构建 corex-serve 后重启应用。',
            8
          )
        }

        unlisten = await listen('corex://not-ready', warn)
        const ready = await invoke<boolean>('ipc_ready')
        if (!ready) warn()
      } catch (err) {
        console.warn('[App] corex 状态检查失败', err)
      }
    })()

    return function () {
      unlisten?.()
    }
  }, [])

  useEffect(function () {
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return
    let unregister: (() => void) | null = null
    let cancelled = false
    ;(async function () {
      try {
        const [{ register, unregister: removeShortcut, isRegistered }, { invoke }] =
          await Promise.all([
            import('@tauri-apps/plugin-global-shortcut'),
            import('@tauri-apps/api/core')
          ])
        const SHORTCUT = 'CommandOrControl+Alt+A'
        if (await isRegistered(SHORTCUT)) await removeShortcut(SHORTCUT)
        await register(SHORTCUT, function (event) {
          if (event.state === 'Pressed') void invoke('screenshot_open')
        })
        if (cancelled) await removeShortcut(SHORTCUT)
        else
          unregister = function () {
            void removeShortcut(SHORTCUT)
          }
      } catch (err) {
        console.warn('[App] 注册截图快捷键失败', err)
      }
    })()
    return function () {
      cancelled = true
      unregister?.()
    }
  }, [])

  // useEffect(function () {
  //   POST_SIGNIN({
  //     username: 'admin',
  //     password: '123456'
  //   }).subscribe(function (response) {
  //     console.log('[POST_SIGNIN] response', response)
  //   })
  // }, [])

  // const LANGUAGE = navigator.language || 'zh-CN'
  // defer(function () {
  // 	return http.get('')
  // })
  // 	.pipe(retry(3))
  // 	.subscribe({
  // 		next(value) {
  // 			console.log('value')
  // 		},
  // 		error(err) {
  // 			console.log('error', err)
  // 		}
  // 	})

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
