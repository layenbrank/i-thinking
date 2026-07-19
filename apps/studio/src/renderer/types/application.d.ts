import type { JSX } from 'react'

declare global {
  namespace Application {
    // interface ComponentProps extends Partial<Application> {
    // draggable: boolean
    // className: ClassValue
    // }

    // type Reflection = Record<Component, (props: ComponentProps) => JSX.Element>
    type Reflection = Record<
      Application.Component,
      React.LazyExoticComponent<(props: ProviderProps) => JSX.Element>
    >
  }
}
