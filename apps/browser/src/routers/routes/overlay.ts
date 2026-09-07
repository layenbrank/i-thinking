import React, { lazy } from 'react'
import { type RouteObject } from 'react-router-dom'

const Overlay = lazy(function () {
  return import('@/views/overlay/overlay.tsx')
})

const routes: RouteObject[] = [
  {
    path: '/overlay',
    element: React.createElement(Overlay)
  }
]

export default routes
