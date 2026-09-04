import { addCollection } from '@iconify/react/offline'
import { createRoot } from 'react-dom/client'

import App from '@/App.tsx'
import '@/styles/index.scss'
import { CSSVAR } from '@/themes'

import AntIconify from '@iconify/json/json/ant-design.json'
import MDIconify from '@iconify/json/json/mdi.json'

addCollection(MDIconify)
addCollection(AntIconify)

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
  console.log('main-process-message', message)
})
