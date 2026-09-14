import { TooltipProvider } from '@i-thinking/design/primitive/tooltip'
import { MotionConfig } from 'motion/react'
import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'

import { Fallback } from '@/components/fallback/index.ts'
import { QueryProvider } from '@/components/provider/query'
import { ThemeProvider, ThemeToaster } from '@/components/provider/theme'
import { router } from '@/routers/index'

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <MotionConfig reducedMotion="user">
          <QueryProvider>
            <Fallback.ErrorBoundary>
              <Suspense fallback={<Fallback.Route />}>
                <RouterProvider router={router} />
              </Suspense>
            </Fallback.ErrorBoundary>
          </QueryProvider>
          <ThemeToaster />
        </MotionConfig>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
