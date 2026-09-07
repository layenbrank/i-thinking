import type { ThemeConfig } from 'antd'
import type { Variant } from 'antd/es/config-provider/context'
import type { SizeType } from 'antd/es/config-provider/SizeContext'

export type ComponentSize = SizeType
export type ComponentVariant = Variant

type AntdThemeComponents = NonNullable<ThemeConfig['components']>

/**
 * Component theme overrides.
 * Ant Design runtime accepts component tokens (e.g. Modal.contentPadding) that are not fully exposed on Config types.
 */
export type ThemeComponent = {
  [K in keyof AntdThemeComponents | string]?: Record<string, unknown>
}

export type ThemeComponentKey = keyof AntdThemeComponents | (string & {})

export type ThemeToken = NonNullable<ThemeConfig['token']>
