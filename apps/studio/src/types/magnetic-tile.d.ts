import type { JSX } from 'react'

declare global {
  namespace MagneticTile {
    // interface ComponentProps extends Partial<MagneticTile> {
    // draggable: boolean
    // className: ClassValue
    // }

    // type Reflection = Record<Component, (props: ComponentProps) => JSX.Element>
    type Reflection = Record<
      MagneticTile.Component,
      React.LazyExoticComponent<(props: ProviderProps) => JSX.Element>
    >
  }
}
