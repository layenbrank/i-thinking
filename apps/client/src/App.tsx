import { XProvider } from '@ant-design/x'
import { theme, type ThemeConfig } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { MirrorPlugin } from '@/plugins/mirror.ts'
import RouterView from '@/routers/routes.tsx'
import { PluginProvider, type Plugin } from './components/provider/plugin.tsx'

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

const plugins: Plugin[] = [MirrorPlugin]

function App() {
  const LANGUAGE = navigator.language || 'zh-CN'
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
    <StrictMode>
      <XProvider
        theme={themeConfigure}
        locale={zhCN}>
        <BrowserRouter>
          <PluginProvider plugins={plugins}>
            <RouterView />
          </PluginProvider>
        </BrowserRouter>
      </XProvider>
    </StrictMode>
  )
}

export default App
