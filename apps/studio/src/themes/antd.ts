import type { ThemeConfig } from 'antd'
import type { MappingAlgorithm } from 'antd/es/theme/interface'
import type { Variant } from 'antd/es/config-provider/context'
import type { SizeType } from 'antd/es/config-provider/SizeContext'
import type { ComponentTokenMap as XComponentTokenMap } from '@ant-design/x/es/theme/interface/components'

export type ComponentSize = SizeType
export type ComponentVariant = Variant

type AntdThemeComponents = NonNullable<ThemeConfig['components']>

type WithAlgorithm<T> = T & {
  algorithm?: boolean | MappingAlgorithm | MappingAlgorithm[]
}

/** @ant-design/x 组件 Token，结构对齐 antd ComponentsConfig */
type XThemeComponents = {
  [K in keyof XComponentTokenMap]?: WithAlgorithm<Partial<NonNullable<XComponentTokenMap[K]>>>
}

/**
 * Studio 自定义组件 Token（非 antd / x 官方组件 Token，经 recipes 透传）。
 * 仅补充官方类型里没有、但配置面板需要的字段。
 */
type RecipeExtras = {
  Modal: {
    contentPadding?: string
  }
}

type AntdThemeComponentsWithExtras = {
  [K in keyof AntdThemeComponents]?: NonNullable<AntdThemeComponents[K]> &
    (K extends keyof RecipeExtras ? RecipeExtras[K] : unknown)
}

/**
 * 组件级主题覆盖：antd ComponentsConfig + @ant-design/x + Studio extras。
 * 配置时保留组件名与 Token 字段的类型提示。
 */
export type ThemeComponent = AntdThemeComponentsWithExtras & XThemeComponents

export type ThemeComponentKey = keyof ThemeComponent

export type ThemeToken = NonNullable<ThemeConfig['token']>
