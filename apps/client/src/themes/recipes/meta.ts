import type { ThemeComponentKey } from '@/themes/antd'

export type RecipeFieldType = 'color' | 'boolean' | 'number'

export interface RecipeField {
  component: ThemeComponentKey
  token: string
  label: string
  type: RecipeFieldType
}

export const RECIPE_TABS = ['layout', 'form', 'feedback'] as const
export type RecipeTab = (typeof RECIPE_TABS)[number]

export const RECIPE_FIELDS: Record<RecipeTab, RecipeField[]> = {
  layout: [
    { component: 'Layout', token: 'headerBg', label: '顶栏背景', type: 'color' },
    { component: 'Layout', token: 'bodyBg', label: '内容区背景', type: 'color' },
    { component: 'Layout', token: 'footerBg', label: '底栏背景', type: 'color' },
    { component: 'Menu', token: 'itemBg', label: '菜单项背景', type: 'color' },
    { component: 'Menu', token: 'colorText', label: '菜单文字', type: 'color' }
  ],
  form: [
    { component: 'Button', token: 'algorithm', label: '按钮算法派生', type: 'boolean' },
    { component: 'Button', token: 'colorPrimary', label: '按钮主色', type: 'color' },
    { component: 'Input', token: 'algorithm', label: '输入框算法派生', type: 'boolean' },
    { component: 'Input', token: 'activeBorderColor', label: '激活边框色', type: 'color' }
  ],
  feedback: [
    { component: 'Modal', token: 'contentBg', label: '弹窗内容背景', type: 'color' },
    { component: 'Modal', token: 'headerBg', label: '弹窗头部背景', type: 'color' }
  ]
}

export const RECIPE_FIELD_INDEX: RecipeField[] = Object.values(RECIPE_FIELDS).flat()
