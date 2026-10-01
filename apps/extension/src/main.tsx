import { addCollection } from '@iconify/react/offline'
import { createRoot } from 'react-dom/client'

import App from '@/App.tsx'

import 'reflect-metadata'

import '@/styles/tailwind.css'
import '@/styles/index.scss'

import AntIconify from '@iconify/json/json/ant-design.json'
import LucideIconify from '@iconify/json/json/lucide.json'
import MDIconify from '@iconify/json/json/mdi.json'

addCollection(MDIconify)
addCollection(AntIconify)
addCollection(LucideIconify)

const container = document.getElementById('app')

if (container) {
  createRoot(container).render(<App />)
}
