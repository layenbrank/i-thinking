import { StyleProvider } from '@ant-design/cssinjs'
import { XProvider } from '@ant-design/x'
import { App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { MotionConfig } from 'motion/react'

import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import localeData from 'dayjs/plugin/localeData'

import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'

import { Fallback } from '@/components/fallback/index.ts'
import { QueryProvider } from '@/components/provider/query'
import { router } from '@/routers/index'
import { useProviderProps } from '@/themes'

dayjs.extend(localeData)
dayjs.locale('zh-cn')

function App() {
  const provider = useProviderProps()

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
              <Suspense fallback={<Fallback.Route />}>
                <RouterProvider router={router} />
              </Suspense>
            </QueryProvider>
          </AntApp>
        </XProvider>
      </StyleProvider>
    </MotionConfig>
  )
}

export default App
