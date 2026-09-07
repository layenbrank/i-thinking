import { addCollection } from '@iconify/react/offline'
import { createRoot } from 'react-dom/client'

import AntIconify from '@iconify/json/json/ant-design.json'
import MDIconify from '@iconify/json/json/mdi.json'

import { installChromiumItc } from '@/bridges/itc-chromium'

import App from '@/App.tsx'
import '@/styles/index.scss'
import { CSSVAR } from '@/themes'

addCollection(MDIconify)
addCollection(AntIconify)

installChromiumItc()

const rootElement = document.getElementById('root') as HTMLElement

const appRoot = createRoot(rootElement, {
  onCaughtError(error) {
    console.error('Root caught an error:', error)
  },
  onUncaughtError(error) {
    console.error('Root caught an uncaught error:', error)
  },
  onRecoverableError(error) {
    console.error('Root caught a recoverable error:', error)
  },
  identifierPrefix: CSSVAR.PREFIX
})

appRoot.render(<App />)

itc.app.onMessage(function (message) {
  console.log('i-thinking-webui-message', message)
})
