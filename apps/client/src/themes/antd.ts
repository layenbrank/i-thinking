import type { ThemeConfig } from 'antd'
import type { Variant } from 'antd/es/config-provider/context'
import type { SizeType } from 'antd/es/config-provider/SizeContext'

export type ComponentSize = SizeType
export type ComponentVariant = Variant
export type ThemeComponent = NonNullable<ThemeConfig['components']>
export type ThemeComponentKey = keyof ThemeComponent
export type ThemeToken = NonNullable<ThemeConfig['token']>
