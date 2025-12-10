<script setup lang="ts">
import { clsx } from 'clsx'
import { useAttrs, computed, reactive } from 'vue'
import { type ClassValue } from 'clsx'
import type { InputProps } from 'ant-design-vue'

// 完全分离InputProps
export interface ComboboxTriggerProps
	extends Omit<InputProps, 'prefix' | 'suffix' | 'addonBefore' | 'addonAfter'> {
	// 使用inputProps传递所有n-input属性
	// inputProps?: InputProps
	comboboxClass?: ClassValue
	inputClass?: ClassValue
}

// 定义插槽名称的联合类型
// export type InputSlotNames = keyof InputSlots

// 扩展InputSlots，添加content插槽
export interface ComboboxTriggerSlots {
	content: () => void
	prefix: () => void
	suffix: () => void
	addonBefore: () => void
	addonAfter: () => void
}

defineOptions({
	name: 'ComboboxTrigger',
	inheritAttrs: false
})

const props = withDefaults(defineProps<ComboboxTriggerProps>(), {})

// 使用扩展后的ComboboxTriggerSlots类型
const slots = defineSlots<ComboboxTriggerSlots>()

const attrs = useAttrs()

const filteredProps = computed(() => {
	const { comboboxClass, inputClass, ...restProps } = props
	return restProps
})

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
		<a-input draggable="false" v-bind="{ ...filteredProps, ...attrs }" :class="[clsx(inputClass)]">
			<template v-for="name in filteredSlots" v-slot:[name]="data" :key="name">
				<slot :name="name" v-bind="processSlot(data)" :key="name"></slot>
			</template>
		</a-input>
		<slot name="content"></slot>
	</div>
</template>

<style lang="scss" scoped>
.combobox-trigger {
	@apply relative;
}
</style>
