import React from 'react'
import { Navigate, useRoutes } from 'react-router-dom'

const Overview = React.lazy(function () {
  return import('@/views/overview/overview.tsx')
})
const Screenshot = React.lazy(function () {
  return import('@/views/screenshot/screenshot.tsx')
})
const Markdown = React.lazy(function () {
  return import('@/views/markdown/markdown.tsx')
})
const Code = React.lazy(function () {
  return import('@/views/code/code.tsx')
})

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
    }
    // {
    //   path: '/background',
    //   element: <Background />
    // }
  ])
}
