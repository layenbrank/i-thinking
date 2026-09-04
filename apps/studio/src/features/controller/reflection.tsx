import React from 'react'

const Navigation = React.lazy(function () {
  return import('@/features/magnetic-tiles/navigation/navigation.tsx')
})

const Reflection: Readonly<Partial<MagneticTile.Reflection>> = {
  navigation: Navigation
}

export { Navigation, Reflection }
