import App from '@/App.tsx'
import '@/styles/index.scss'
import '@ant-design/v5-patch-for-react-19'
import { createRoot } from 'react-dom/client'

const rootElement = document.getElementById('root') as HTMLElement

const root = createRoot(rootElement)

root.render(<App />)
