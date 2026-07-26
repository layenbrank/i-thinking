import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom'

const Overview = lazy(function () {
  return import('@/views/overview/overview.tsx')
})
const Screenshot = lazy(function () {
  return import('@/views/screenshot/screenshot.tsx')
})
const Overlay = lazy(function () {
  return import('@/views/overlay/overlay')
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
    path: '/screenshot',
    element: <Screenshot />
  },
  {
    path: '/overlay',
    element: <Overlay />
  }
]

export const router = createBrowserRouter(routes)

export { routes }
