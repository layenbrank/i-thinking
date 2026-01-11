import { createRoot } from 'react-dom/client'

import App from '@/App.tsx'
import '@/styles/index.scss'

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
