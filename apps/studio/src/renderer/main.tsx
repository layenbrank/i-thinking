import { addCollection } from '@iconify/react'
import { createRoot } from 'react-dom/client'

import App from '@/App.tsx'
import '@/styles/index.scss'
import { findStudio } from '@/lib/studio.ts'

import AntDIconify from '@iconify/json/json/ant-design.json'
import MDIconify from '@iconify/json/json/mdi.json'
import CustomIconify from '@i-thinking/shared/iconify.json'

addCollection(MDIconify)
addCollection(AntDIconify)
addCollection(CustomIconify)

const rootElement = document.getElementById('app') as HTMLElement

const root = createRoot(rootElement, {
  onCaughtError(error) {
    console.error('Root caught an error:', error)
  },
  onUncaughtError(error) {
    console.error('Root caught an uncaught error:', error)
  },
  onRecoverableError(error) {
    console.error('Root caught a recoverable error:', error)
  }
})

root.render(<App />)

try {
  findStudio().app.onMessage(function (message) {
    console.log('main-process-message', message)
  })
} catch (error) {
  // 纯网页模式无 bridge
  console.error('Error occurred while setting up message listener:', error)
}
