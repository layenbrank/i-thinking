import { addCollection } from '@iconify/react/offline'
import { createRoot } from 'react-dom/client'

import App from '@/App.tsx'
import '@/styles/tailwind.css'
import '@/styles/index.scss'

import AntIconify from '@iconify/json/json/ant-design.json'
import MDIconify from '@iconify/json/json/mdi.json'

/** React 生成 DOM id 的前缀，避免与页面既有 id 冲突 */
const IDENTIFIER_PREFIX = 'ith'

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
  identifierPrefix: IDENTIFIER_PREFIX
})

appRoot.render(<App />)
