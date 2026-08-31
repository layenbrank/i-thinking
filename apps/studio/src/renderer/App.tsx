import { XProvider } from '@ant-design/x'
import { App as AntApp } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import localeData from 'dayjs/plugin/localeData'
import { Suspense, useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { MotionConfig } from 'motion/react'

import { Fallback } from '@/components/fallback/index.ts'
import { PluginProvider, type Plugin } from '@/components/provider/plugin.tsx'
import { QueryProvider } from '@/components/provider/query'
import { router } from '@/routers/index'
import { useSettingsStore } from '@/stores/setting.ts'
import { useProviderProps } from '@/themes'

dayjs.extend(localeData)
dayjs.locale('zh-cn')

const plugins: Plugin[] = []

function App() {
  const provider = useProviderProps()

  useEffect(function () {
    void useSettingsStore.getState().initialize()

    if (!import.meta.env.DEV) return
    void itc.devtools.updateVisible({
      visible: true
    })
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
