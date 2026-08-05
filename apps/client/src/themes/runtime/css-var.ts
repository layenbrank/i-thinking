import { theme } from 'antd'
import { clsx, type ClassValue } from 'clsx'

import { CSSVAR } from '@/themes/runtime/build'

/**
 * 自定义节点挂接 antd cssVar 作用域。
 * 注入规则为 `.ith { --ith-*: ... }`；hashId 与 antd 组件对齐，便于同主题隔离。
 */
function useCssVarClassName(...classNames: ClassValue[]) {
  const { hashId } = theme.useToken()
  return clsx(hashId, CSSVAR.KEY, classNames)
}

export { useCssVarClassName }
