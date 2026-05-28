import { XProvider } from '@ant-design/x'
import { theme, type ThemeConfig } from 'antd'
import zhCN from 'antd/locale/zh_CN'
// import enUS from 'antd/locale/en_US'

import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import localeData from 'dayjs/plugin/localeData'

// import { StrictMode } from 'react'
import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'

import { Fallback } from '@/components/fallback/index.ts'
import { PluginProvider, type Plugin } from '@/components/provider/plugin.tsx'
import { IntelligencePlugin } from '@/plugins/intelligence.ts'
import { StoragePlugin } from '@/plugins/storage.ts'
import { router } from '@/routers/index'
import { useMirrorStore } from '@/stores/mirror.ts'

// import { POST_SIGNIN } from '@/apis/auth.ts'
dayjs.extend(localeData)
dayjs.locale('zh-cn')

const themeConfigure: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#4080ff'
  },
  components: {
    Button: {
      algorithm: true
    },
    Input: {
      algorithm: true
    },
    Layout: {
      algorithm: true,
      headerBg: '#000000',
      bodyBg: '#f5f5f5',
      footerBg: '#ffffff'
    },
    Menu: {
      algorithm: true,
      itemBg: '#000000',
      colorText: '#ffffff'
    }
  }
}

const plugins: Plugin[] = [
  { ...StoragePlugin, priority: 10 },
  // KeyCodePlugin,
  IntelligencePlugin
]

function App() {
  useEffect(function () {
    void useMirrorStore.getState().toInitialize()
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
    // <StrictMode>
    <PluginProvider
      plugins={plugins}
      onError={onPluginError}>
      <XProvider
        locale={zhCN}
        theme={themeConfigure}>
        <Suspense fallback={<Fallback.Route />}>
          <RouterProvider router={router} />
        </Suspense>
      </XProvider>
    </PluginProvider>
    // </StrictMode>
  )
}

export default App
