import { Navigate, useRoutes } from 'react-router-dom'
import { lazy } from 'react'

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
const Intelligence = lazy(function () {
  return import('@/views/intelligence/intelligence.tsx')
})
// const Background = lazy(function () {
//   return import('@/views/background/background.tsx')
// })

export default function RouterView() {
  return useRoutes([
    {
      path: '/',
      element: (
        <Navigate
          to={'/screenshot'}
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
      path: '/screenshot',
      element: <Screenshot />
    }

    // {
    //   path: '/background',
    //   element: <Background />
    // }
  ])
}
