import { addCollection } from '@iconify/react'
import { createRoot } from 'react-dom/client'
import 'reflect-metadata'

import App from '@/App.tsx'
import '@/styles/index.scss'

import AntDesignIconify from '@i-thinking/shared/ant-design.json'
import MDIconify from '@i-thinking/shared/mdi.json'
import CustomIconify from '@i-thinking/shared/iconify.json'
import { CSSVAR } from '@/themes'

addCollection(AntDesignIconify)
addCollection(MDIconify)
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
