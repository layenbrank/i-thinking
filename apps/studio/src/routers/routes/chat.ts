import React, { lazy } from 'react'
import { type RouteObject } from 'react-router-dom'

const Chat = lazy(function () {
  return import('@/views/chat/chat.tsx')
})

const routes: RouteObject[] = [
  {
    path: '/chat',
    element: React.createElement(Chat)
  }
]

export default routes
