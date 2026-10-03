import React from 'react'

const Navigation = React.lazy(function () {
  return import('@/features/magnetic-tiles/navigation/navigation.tsx')
})

const Directive = React.lazy(function () {
  return import('@/features/magnetic-tiles/directive/directive.tsx')
})

const Capture = React.lazy(function () {
  return import('@/features/magnetic-tiles/capture/capture.tsx')
})

const Reflection: Readonly<Partial<MagneticTile.Reflection>> = {
  navigation: Navigation,
  directive: Directive,
  capture: Capture
}

export { Capture, Directive, Navigation, Reflection }
