import React, { lazy } from 'react'
import { createHashRouter, Navigate, type RouteObject } from 'react-router-dom'

/**
 * 应用路由表（唯一的 SSOT —— Vue 侧已全部迁完，不再有 catch-all island）。
 */

const Overview = lazy(function () {
  return import('@/views/overview/overview.tsx')
})

const NotFound = lazy(function () {
  return import('@/views/not-found.tsx')
})

const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <Navigate
        replace
        to="/overview"
      />
    )
  },
  {
    path: '/overview',
    element: React.createElement(Overview)
  },
  {
    path: '*',
    element: React.createElement(NotFound)
  }
]

export function buildReactRouter() {
  return createHashRouter(routes)
}
