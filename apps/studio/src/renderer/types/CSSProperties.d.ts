declare namespace React {
  interface CSSProperties {
    [key: `--${string}`]: string
    appRegion?: 'drag' | 'no-drag'
    'app-region'?: 'drag' | 'no-drag'
    '-webkit-app-region'?: 'drag' | 'no-drag'
    /**
     * The index signature was removed to enable closed typing for style
     * using CSSType. You're able to use type assertion or module augmentation
     * to add properties or an index signature of your own.
     *
     * For examples and more information, visit:
     * https://github.com/frenic/csstype#what-should-i-do-when-i-get-type-errors
     */
  }
}
