import React, { lazy } from 'react'
import { type RouteObject } from 'react-router-dom'

const Overview = lazy(function () {
  return import('@/views/overview/overview.tsx')
})

const routes: RouteObject[] = [
  {
    path: '/overview',
    element: React.createElement(Overview)
  }
]

export default routes
