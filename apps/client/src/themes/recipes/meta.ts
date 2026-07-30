import type { ThemeComponentKey } from '@/themes/antd'

/** Token 定义来源：markdown/reference/antd/llms-full-cn.txt → ## 组件 Token */
export type RecipeFieldType = 'color' | 'boolean' | 'number' | 'string'

export interface RecipeField {
  component: ThemeComponentKey
  token: string
  label: string
  type: RecipeFieldType
}

export const RECIPE_TABS = ['layout', 'navigation', 'form', 'dataDisplay', 'feedback'] as const
export type RecipeTab = (typeof RECIPE_TABS)[number]

export const RECIPE_FIELDS: Record<RecipeTab, RecipeField[]> = {
  layout: [
    { component: 'Layout', token: 'headerBg', label: '顶栏背景', type: 'color' },
    { component: 'Layout', token: 'bodyBg', label: '内容区背景', type: 'color' },
    { component: 'Layout', token: 'footerBg', label: '底栏背景', type: 'color' },
    { component: 'Divider', token: 'colorSplit', label: '分割线颜色', type: 'color' }
  ],
  navigation: [
    { component: 'Menu', token: 'itemBg', label: '菜单项背景', type: 'color' },
    { component: 'Menu', token: 'colorText', label: '菜单文字', type: 'color' },
    { component: 'Tabs', token: 'cardBg', label: '卡片标签背景', type: 'color' },
    { component: 'Segmented', token: 'trackBg', label: '分段器轨道背景', type: 'color' },
    { component: 'Tree', token: 'nodeSelectedBg', label: '树节点选中背景', type: 'color' }
  ],
  form: [
    { component: 'Button', token: 'algorithm', label: '按钮算法派生', type: 'boolean' },
    { component: 'Button', token: 'colorPrimary', label: '按钮主色', type: 'color' },
    { component: 'Button', token: 'paddingInline', label: '按钮横向内边距', type: 'number' },
    { component: 'Input', token: 'algorithm', label: '输入框算法派生', type: 'boolean' },
    { component: 'Input', token: 'activeBorderColor', label: '激活边框色', type: 'color' },
    { component: 'Select', token: 'optionSelectedBg', label: '选项选中背景', type: 'color' },
    { component: 'Checkbox', token: 'colorPrimary', label: '复选框主色', type: 'color' },
    { component: 'Switch', token: 'colorPrimary', label: '开关主色', type: 'color' }
  ],
  dataDisplay: [
    { component: 'Typography', token: 'titleMarginBottom', label: '标题下边距', type: 'string' },
    { component: 'Typography', token: 'fontSizeHeading4', label: '四级标题字号', type: 'number' },
    { component: 'Card', token: 'paddingLG', label: '卡片内边距', type: 'number' },
    { component: 'Table', token: 'headerBg', label: '表格头背景', type: 'color' }
  ],
  feedback: [
    { component: 'Modal', token: 'contentPadding', label: '弹窗内边距', type: 'string' },
    { component: 'Modal', token: 'titleFontSize', label: '弹窗标题字号', type: 'number' },
    { component: 'Modal', token: 'contentBg', label: '弹窗内容背景', type: 'color' },
    { component: 'Modal', token: 'headerBg', label: '弹窗头部背景', type: 'color' },
    { component: 'Drawer', token: 'footerPaddingInline', label: '抽屉底部横向内边距', type: 'number' },
    { component: 'Tooltip', token: 'colorBgSpotlight', label: '提示背景色', type: 'color' }
  ]
}

export const RECIPE_FIELD_INDEX: RecipeField[] = Object.values(RECIPE_FIELDS).flat()
