import type { SiderProps, LayoutProps } from 'ant-design-vue'

import BaseLayout from './base-layout/index.vue'
import MacLayout from './mac-layout/index.vue'
import type { ClassValue } from 'clsx'
import type { CSSProperties } from 'vue'

interface BaseProps {
  class?: ClassValue[]
  style?: CSSProperties
}

type BaseLayoutProps = LayoutProps & BaseProps

type BaseMainProps = LayoutProps & BaseProps

type BaseSiderProps = SiderProps & BaseProps

type BaseHeaderProps = LayoutProps & BaseProps

type BaseContentProps = LayoutProps & BaseProps

type BaseFooterProps = LayoutProps & BaseProps

export interface BaseLayoutOptions {
  baseLayout?: BaseLayoutProps
  baseMain?: BaseMainProps
  baseSider?: BaseSiderProps
  baseHeader?: BaseHeaderProps
  baseContent?: BaseContentProps
  baseFooter?: BaseFooterProps
}
export interface MacLayoutOptions {
  macLayout?: BaseLayoutProps
  macHeader?: BaseHeaderProps
  macContent?: BaseContentProps
  macFooter?: BaseFooterProps
}

export { BaseLayout, MacLayout }
