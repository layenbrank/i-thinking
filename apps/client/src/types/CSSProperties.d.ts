/**
 * Allow CSS custom properties on style objects.
 *
 * Augment csstype `Properties` (not only React.CSSProperties): empty
 * `CSSProperties extends Properties` is transparent to excess-property checks,
 * so custom properties must be declared on `Properties` itself.
 *
 * This file must be a module (`import` / `export`) so `declare module`
 * augments the real `csstype` package instead of replacing it.
 *
 * `declare global` keeps the ambient `React` namespace used by `React.FC` etc.
 *
 * @see https://github.com/frenic/csstype#what-should-i-do-when-i-get-type-errors
 */
import type {} from 'csstype'

declare module 'csstype' {
  interface Properties {
    [key: `--${string}`]: string | number | undefined
  }
}

declare global {
  namespace React {
    interface CSSProperties {
      [key: `--${string}`]: string | number | undefined
    }
  }
}

export {}
