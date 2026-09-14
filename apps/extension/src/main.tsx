import { createRoot } from 'react-dom/client'

import App from '@/App.tsx'

import 'reflect-metadata'

import '@/styles/tailwind.css'
import '@/styles/index.scss'

const container = document.getElementById('app')

if (container) {
  createRoot(container).render(<App />)
}
