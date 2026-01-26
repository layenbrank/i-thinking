import { Navigate, useRoutes } from 'react-router-dom'
import React from 'react'

const Overview = React.lazy(() => import('@/views/overview/overview.tsx'))
const Screenshot = React.lazy(() => import('@/views/screenshot/screenshot.tsx'))
const Markdown = React.lazy(() => import('@/views/markdown/markdown.tsx'))
const Code = React.lazy(() => import('@/views/code/code.tsx'))
const Background = React.lazy(() => import('@/views/background/background.tsx'))

export default function RouterView() {
  return useRoutes([
    {
      path: '/',
      element: (
        <Navigate
          to={'/overview'}
          replace
        />
      )
    },
    {
      path: '/overview',
      element: <Overview />
    },
    {
      path: '/markdown',
      element: <Markdown />
    },
    {
      path: '/code',
      element: <Code />
    },
    {
      path: '/screenshot',
      element: <Screenshot />
    },
    {
      path: '/background',
      element: <Background />
    }
  ])
}
