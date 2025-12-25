import { Navigate, useRoutes } from 'react-router-dom'
import React from 'react'

const Overview = React.lazy(() => import('@/views/overview/overview.tsx'))

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
    }
  ])
}
