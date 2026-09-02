import { addCollection } from '@iconify/react/offline'
import { createRoot } from 'react-dom/client'
import 'reflect-metadata'

import App from '@/App.tsx'
import '@/styles/index.scss'
import { CSSVAR } from '@/themes'

import AntDIconify from '@iconify/json/json/ant-design.json'
import MDIconify from '@iconify/json/json/mdi.json'
import CustomIconify from '@i-thinking/shared/iconify.json'

addCollection(MDIconify)
addCollection(AntDIconify)
addCollection(CustomIconify)

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
