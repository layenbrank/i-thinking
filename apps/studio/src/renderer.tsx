import { addCollection } from '@iconify/react'
import { createRoot } from 'react-dom/client'

import App from '@/App.tsx'
import '@/styles/index.scss'

import CustomIconify from '@i-thinking/shared'

addCollection(CustomIconify)

const rootElement = document.getElementById('root') as HTMLElement

// window.addEventListener(
//   'DOMContentLoaded',
//   () => {
//     const cspMeta = document.createElement('meta')
//     cspMeta.httpEquiv = 'Content-Security-Policy'
//     cspMeta.content =
//       "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
//     document.head.appendChild(cspMeta)
//   },
//   {
//     once: true
//   }
// )

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

if (window.ipcRenderer?.app?.onMessage) {
  window.ipcRenderer.app.onMessage(function (message) {
    console.log('main-process-message', message)
  })
}
