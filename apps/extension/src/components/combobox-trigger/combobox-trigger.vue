<script setup lang="ts">
import { clsx } from 'clsx'
import { useAttrs } from 'vue'
import type { ComboboxTriggerProps, ComboboxTriggerSlots } from './index.ts'

defineOptions({
  name: 'ComboboxTrigger',
  inheritAttrs: false
})

const props = withDefaults(defineProps<ComboboxTriggerProps>(), {})

// 使用扩展后的ComboboxTriggerSlots类型
const slots = defineSlots<ComboboxTriggerSlots>()

const attrs = useAttrs()

// 计算属性过滤掉 content 插槽，使用类型安全的方式
const filteredSlots = computed(() => {
  // 获取所有插槽名称并过滤
  return Object.keys(slots).filter(
    (name): name is keyof ComboboxTriggerSlots => name !== 'content' && name in slots
  )
})

// 处理插槽数据，确保value属性存在
function processSlot(data: any) {
  if (data && data.value === undefined) {
    return { ...data, value: '' }
  }
  return data
}
</script>

<template>
  <div :class="[clsx('combobox-trigger', comboboxClass)]">
    <a-input v-bind="{ ...props.inputProps, ...attrs }" :class="[clsx(inputClass)]">
      <template v-for="name in filteredSlots" v-slot:[name]="data" :key="name">
        <slot :name="name" v-bind="processSlot(data)"></slot>
      </template>
    </a-input>
    <slot name="content"></slot>
  </div>
</template>

<style lang="scss" scoped></style>
