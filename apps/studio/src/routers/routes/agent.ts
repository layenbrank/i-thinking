import React, { lazy } from 'react'
import { Navigate, Outlet, type RouteObject } from 'react-router-dom'

const Chat = lazy(function () {
  return import('@/views/agent/chat/chat.tsx')
})

const Settings = lazy(function () {
  return import('@/views/agent/settings/settings.tsx')
})

/**
 * `/agent` 是 agent 窗口的**入口**（布局路由）：聊天与设置都是它的**子页面**，互斥渲染。
 *
 * URL 只有两个：`/agent/chat`（默认）与 `/agent/settings`；`/agent` 自己重定向到 `/agent/chat`
 * （窗口启动也直接开 `/agent/chat`，见 `host/capabilities/window-registry.ts` 的规格表）。
 * 两个子页之间的切换由根布局的转场统一接管（`routers/transition.tsx`）。
 *
 * 目录与路由同形：页面是 `views/agent/`，两个子页面分别是 `views/agent/chat/` 与
 * `views/agent/settings/`（`views/<dir>` 是页面，子页面跟着所属页面走）；
 * 窗口标题栏是两个子页面共用的，放 `views/agent/components/utility.tsx`。
 *
 * 设置页读写的是 agent 自己的存储（`stores/agent.ts`，谁的功能谁维护）；
 * 应用级设置归 `stores/settings.ts`（**目前一项都没有**，等真有消费者的项出现再建）。
 */
const routes: RouteObject[] = [
  {
    path: '/agent',
    element: React.createElement(Outlet),
    children: [
      { index: true, element: React.createElement(Navigate, { replace: true, to: 'chat' }) },
      { path: 'chat', element: React.createElement(Chat) },
      { path: 'settings', element: React.createElement(Settings) }
    ]
  }
]

export default routes
