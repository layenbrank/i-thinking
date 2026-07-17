import React from 'react'
import { Navigate, useRoutes } from 'react-router-dom'

const Overview = React.lazy(function () {
  return import('@/views/overview/overview.tsx')
})

export default function RouterView() {
  return useRoutes([
    {
      path: '/',
      element: (
        <Navigate
          to="/overview"
          replace
        />
      )
    },
    {
      path: '/overview',
      element: <Overview />
    }
  ])
}
