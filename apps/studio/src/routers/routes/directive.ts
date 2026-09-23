import React, { lazy } from 'react'
import { Outlet, type RouteObject } from 'react-router-dom'

const Directive = lazy(function () {
  return import('@/views/directive/directive.tsx')
})

const DirectiveWorkspace = lazy(function () {
  return import('@/views/directive/workspace.tsx')
})

/**
 * `/directive` 是「卡片墙」（入口）：所有指令连运行状态一起铺开，是看与跑的地方；
 * `/directive/:name` 是「编排台」：左列表 + 编辑器 + 运行台，是改的地方。
 *
 * 拆两条路由而不是页内切视图：两边都是整页布局（工具件、运行台各有一套），
 * 用 URL 表达「在看哪条」才能刷新回来还在原地、也才能被前进后退键来回走。
 * 名字对不上目录里任何一条时（新增指令的草稿）照样是编排台，判据在编辑器里。
 */
const routes: RouteObject[] = [
  {
    path: '/directive',
    element: React.createElement(Outlet),
    children: [
      { index: true, element: React.createElement(Directive) },
      { path: ':name', element: React.createElement(DirectiveWorkspace) }
    ]
  }
]

export default routes
