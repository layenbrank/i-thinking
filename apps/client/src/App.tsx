import { XProvider } from '@ant-design/x'
import { theme, type ThemeConfig } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
// import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { PluginProvider, type Plugin } from '@/components/provider/plugin.tsx'
import { IntelligencePlugin } from '@/plugins/intelligence.ts'
import { KeyCodePlugin } from '@/plugins/keycode.ts'
import { MirrorPlugin } from '@/plugins/mirror.ts'
import { StoragePlugin } from '@/plugins/storage.ts'

import RouterView from '@/routers/routes.tsx'

// import { POST_SIGNIN } from '@/apis/auth.ts'

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
  MirrorPlugin,
  KeyCodePlugin,
  StoragePlugin,
  IntelligencePlugin
]

function App() {
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

  return (
    // <StrictMode>
    <PluginProvider plugins={plugins}>
      <XProvider
        locale={zhCN}
        theme={themeConfigure}>
        <BrowserRouter>
          <RouterView />
        </BrowserRouter>
      </XProvider>
    </PluginProvider>
    // </StrictMode>
  )
}

export default App
