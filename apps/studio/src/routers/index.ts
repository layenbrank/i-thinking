import React from 'react'
import { Navigate, createHashRouter, type RouteObject } from 'react-router-dom'

import { RouteTransition } from './transition.tsx'

type RouteModule = {
  default: RouteObject | RouteObject[]
}

const modules: Record<string, RouteModule> = import.meta.glob('./routes/**/*.{ts,tsx}', {
  eager: true
})

const pages: RouteObject[] = []

for (const module of Object.values(modules)) {
  if (!module?.default) continue
  const defined = module.default
  if (Array.isArray(defined)) pages.push(...defined)
  else pages.push(defined)
}

/**
 * 各页面挂在同一个**无路径布局路由**下：切页面（如 `/agent` ↔ `/agent/settings`）统一走转场，
 * 新增路由不用各自处理动效（见 `transition.tsx`）。
 */
const routes: RouteObject[] = [
  {
    element: React.createElement(RouteTransition),
    children: [
      {
        path: '/',
        element: React.createElement(Navigate, {
          replace: true,
          to: '/overview'
        })
      },
      ...pages
    ]
  }
]

/** 打包为 file:// 时 Browser history 无法匹配路径，必须用 Hash */
const router = createHashRouter(routes)

export { router, routes }
