import { Layout, Typography, theme, Button, Space, Card, App as AntApp } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import { XProvider } from '@ant-design/x'
import zhCN from 'antd/locale/zh_CN'
import { Suspense, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import dayjs from 'dayjs'
import localeData from 'dayjs/plugin/localeData'
import { Fallback } from '@/components/fallback/index.ts'

import { QueryProvider } from '@/components/provider/query'
import { router } from '@/routers/index'

import 'dayjs/locale/zh-cn'

// import { useProviderProps } from '@/themes'

dayjs.extend(localeData)
dayjs.locale('zh-cn')

const { Header, Content } = Layout
const { Title, Paragraph, Text } = Typography

const SAMPLE_URLS = [
  { title: 'GitHub', url: 'https://github.com' },
  { title: 'Ant Design', url: 'https://ant.design' },
  { title: 'Chromium', url: 'https://www.chromium.org' }
] as const

function App() {
  // const provider = useProviderProps()

  const [lastOpened, setLastOpened] = useState<string | null>(null)

  function openUrl(url: string) {
    void itc.shell.open({ url }).then(function () {
      setLastOpened(url)
    })
  }

  useEffect(function () {
    console.log('App mounted', itc)
    return function () {
      console.log('App unmounted', itc)
    }
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <StyleProvider hashPriority="low">
        <XProvider
          locale={zhCN}
          theme={{ algorithm: theme.defaultAlgorithm }}>
          <AntApp
            message={{ maxCount: 3 }}
            notification={{ maxCount: 1 }}>
            <QueryProvider>
              <Fallback.ErrorBoundary>
                <Suspense fallback={<Fallback.Route />}>
                  <RouterProvider router={router} />
                </Suspense>
              </Fallback.ErrorBoundary>
            </QueryProvider>
          </AntApp>
        </XProvider>
      </StyleProvider>
    </MotionConfig>
  )
}

export default App
