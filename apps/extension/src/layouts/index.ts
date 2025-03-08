import type {
  LayoutProps,
  LayoutSiderProps,
  LayoutHeaderProps,
  LayoutContentProps,
  LayoutFooterProps
} from 'naive-ui'

import BaseLayout from './base-layout/index.vue'
import type { ClassValue } from 'clsx'
import type { CSSProperties } from 'vue'

interface BaseLayoutProps extends LayoutProps {
  class?: ClassValue[]
  style?: CSSProperties
}
interface BaseMainProps extends LayoutProps {
  class?: ClassValue[]
  style?: CSSProperties
}
interface BaseSiderProps extends LayoutSiderProps {
  class?: ClassValue[]
  style?: CSSProperties
}
interface BaseHeaderProps extends LayoutHeaderProps {
  class?: ClassValue[]
  style?: CSSProperties
}
interface BaseContentProps extends LayoutContentProps {
  class?: ClassValue[]
  style?: CSSProperties
}
interface BaseFooterProps extends LayoutFooterProps {
  class?: ClassValue[]
  style?: CSSProperties
}

export interface BaseLayoutOptions {
  baseLayout?: BaseLayoutProps
  baseMain?: BaseMainProps
  baseSider?: BaseSiderProps
  baseHeader?: BaseHeaderProps
  baseContent?: BaseContentProps
  baseFooter?: BaseFooterProps
}

export { BaseLayout }
