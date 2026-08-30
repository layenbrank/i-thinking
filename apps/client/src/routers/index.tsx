import { lazy } from 'react'
import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom'
import Overlay from '@/views/overlay/overlay'

const Overview = lazy(function () {
  return import('@/views/overview/overview.tsx')
})

const Agent = lazy(function () {
  return import('@/views/agent/agent.tsx')
})

const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <Navigate
        replace
        to={'/overview'}
      />
    )
  },
  {
    path: '/overview',
    element: <Overview />
  },
  {
    path: '/overlay',
    element: <Overlay />
  },
  {
    path: '/agent',
    element: <Agent />
  }
]

export const router = createBrowserRouter(routes)

export { routes }
