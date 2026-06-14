import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom'

const Clock = lazy(function () {
  return import('@/views/clock/clock')
})
const Countdown = lazy(function () {
  return import('@/views/countdown/countdown')
})
const Code = lazy(function () {
  return import('@/views/code/code')
})
const Example = lazy(function () {
  return import('@/views/example/example.tsx')
})
const Overview = lazy(function () {
  return import('@/views/overview/overview.tsx')
})
const Markdown = lazy(function () {
  return import('@/views/markdown/markdown.tsx')
})
const Screenshot = lazy(function () {
  return import('@/views/screenshot/screenshot.tsx')
})
const Morph = lazy(function () {
  return import('@/views/morph/morph.tsx')
})
const Intelligence = lazy(function () {
  return import('@/views/intelligence/intelligence.tsx')
})
const Calendar = lazy(function () {
  return import('@/views/calendar/calendar.tsx')
})
const Marketplace = lazy(function () {
  return import('@/views/marketplace/marketplace.tsx')
})
const Booth = lazy(function () {
  return import('@/views/marketplace/booth/booth')
})
const Customize = lazy(function () {
  return import('@/views/marketplace/customize/customize.tsx')
})
const NavigatePage = lazy(function () {
  return import('@/views/marketplace/navigate/navigate.tsx')
})
// const Background = lazy(function () {
//   return import('@/views/background/background.tsx')
// })

const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <Navigate
        replace
        to={'/overview'}
      />
    )
  },
  {
    path: '/overview',
    element: <Overview />
  },
  {
    path: '/markdown',
    element: <Markdown />
  },
  {
    path: '/intelligence',
    element: <Intelligence />
  },
  {
    path: '/code',
    element: <Code />
  },
  {
    path: '/example',
    element: <Example />
  },
  {
    path: '/morph',
    element: <Morph />
  },
  {
    path: '/screenshot',
    element: <Screenshot />
  },
  {
    path: '/calendar',
    element: <Calendar />
  },
  {
    path: '/clock',
    element: <Clock />
  },
  {
    path: '/countdown',
    element: <Countdown />
  },
  {
    path: '/marketplace',
    element: <Marketplace />,
    children: [
      {
        index: true,
        element: <Booth />
      },
      {
        path: 'booth',
        element: <Booth />
      },
      {
        path: 'customize',
        element: <Customize />
      },
      {
        path: 'navigate',
        element: <NavigatePage />
      }
    ]
  }
]

export const router = createBrowserRouter(routes)

export { routes }
