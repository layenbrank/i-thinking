import { type ClassValue } from 'clsx'
import type { InputProps } from 'ant-design-vue'

import ComboboxTrigger from './combobox-trigger.vue'

// 完全分离InputProps
export interface ComboboxTriggerProps {
  // 使用inputProps传递所有n-input属性
  inputProps?: InputProps
  comboboxClass?: ClassValue
  inputClass?: ClassValue
}

// 定义插槽名称的联合类型
// export type InputSlotNames = keyof InputSlots

// 扩展InputSlots，添加content插槽
export interface ComboboxTriggerSlots {
  content: () => void
}

export { ComboboxTrigger }
