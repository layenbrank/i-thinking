import React from 'react'
import { Navigate, createHashRouter, type RouteObject } from 'react-router-dom'

type RouteModule = {
  default: RouteObject | RouteObject[]
}

const modules: Record<string, RouteModule> = import.meta.glob('./routes/**/*.{ts,tsx}', {
  eager: true
})

const routes: RouteObject[] = [
  {
    path: '/',
    element: React.createElement(Navigate, {
      replace: true,
      to: '/overview'
    })
  }
]

for (const module of Object.values(modules)) {
  if (!module?.default) continue
  const defined = module.default
  if (Array.isArray(defined)) routes.push(...defined)
  else routes.push(defined)
}

/** 打包为 file:// 时 Browser history 无法匹配路径，必须用 Hash */
const router = createHashRouter(routes)

export { router, routes }
