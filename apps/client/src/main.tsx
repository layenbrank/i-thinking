import { addCollection } from '@iconify/react'
import { createRoot } from 'react-dom/client'
import 'reflect-metadata'

import App from '@/App.tsx'
import '@/styles/index.scss'

import MDIconify from '@i-thinking/shared/mdi.json'

addCollection(MDIconify)

const rootElement = document.getElementById('root') as HTMLElement

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
  // identifierPrefix: 'i-thinking-'
})

root.render(<App />)
