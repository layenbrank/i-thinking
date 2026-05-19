import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom'

const Code = lazy(function () {
  return import('@/views/code/code')
})
const Example = lazy(function () {
  return import('@/views/example/example.tsx')
})
const Overview = lazy(function () {
  return import('@/views/overview/overview.tsx')
})
const Markdown = lazy(function () {
  return import('@/views/markdown/markdown.tsx')
})
const Screenshot = lazy(function () {
  return import('@/views/screenshot/screenshot.tsx')
})
const Morph = lazy(function () {
  return import('@/views/morph/morph.tsx')
})
const Intelligence = lazy(function () {
  return import('@/views/intelligence/intelligence.tsx')
})
// const Background = lazy(function () {
//   return import('@/views/background/background.tsx')
// })

const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <Navigate
        replace
        to={'/morph'}
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
    path: '/intelligence',
    element: <Intelligence />
  },
  {
    path: '/code',
    element: <Code />
  },
  {
    path: '/example',
    element: <Example />
  },
  {
    path: '/morph',
    element: <Morph />
  },
  {
    path: '/screenshot',
    element: <Screenshot />
  }
]

export const router = createBrowserRouter(routes)

export { routes }
