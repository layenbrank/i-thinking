import { XProvider } from '@ant-design/x'
import { theme, type ThemeConfig } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { HashRouter } from 'react-router-dom'

import RouterView from '@/routers/routes.tsx'

// import { POST_SIGNIN } from '@/apis/auth.ts'

dayjs.locale('zh-cn')
// console.log(
//   window.ipcRenderer.database.query('SELECT * FROM user').then((res) => {
//     console.log('[window.ipcRenderer.database.query] res', res)
//   })
// )

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

setInterval(() => {
  fetch('http://127.0.0.1:3000/api/v1').then(function (response) {
    console.log('response', response)
  })
}, 6000)
function App() {
  return (
    <XProvider
      locale={zhCN}
      theme={themeConfigure}>
      <HashRouter>
        <RouterView />
      </HashRouter>
    </XProvider>
  )
}

export default App
