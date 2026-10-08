import { addCollection } from '@iconify/react/offline'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import { watchAppearance } from '@/features/window/appearance.ts'
import '@/styles/tailwind.css'
import '@/styles/index.scss'

import AntIconify from '@iconify/json/json/ant-design.json'
import LucideIconify from '@iconify/json/json/lucide.json'
import MDIconify from '@iconify/json/json/mdi.json'

/** React 生成 DOM id 的前缀，避免与页面既有 id 冲突 */
const IDENTIFIER_PREFIX = 'ith'

/** overlay 窗口必须在首屏前就透明，否则 design 的 body bg-background 会盖死透明 BrowserWindow */
if (location.hash === '#/overlay' || location.hash.startsWith('#/overlay?')) {
  document.documentElement.dataset.shell = 'overlay'
}

addCollection(MDIconify)
addCollection(AntIconify)
addCollection(LucideIconify)
watchAppearance()

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
