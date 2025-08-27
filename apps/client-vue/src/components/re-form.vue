<script setup lang="ts">
import type { JSX } from 'vue/jsx-runtime'
import { type FormProps, type FormItemProps } from 'ant-design-vue'
import { clsx, type ClassValue } from 'clsx'

export interface FormOptions extends FormItemProps {
	label: string
	key: string
	value: string
	class?: ClassValue
	content: () => JSX.Element
	unwatch: null | (() => void)
	template?: string
}

export interface ReFormProps extends FormProps {
	options: FormOptions[]
}

defineOptions({
	name: 're-form'
})

const props = withDefaults(defineProps<ReFormProps>(), {})

const formProps = computed(() => {
	const { options: _, ...remains } = props
	return { ...remains }
})

function filterOption(option: FormOptions) {
	const { unwatch: _, content: __, template: ___, ...remains } = option
	return { ...remains }
}
</script>

<template>
	<a-form v-bind="formProps">
		<a-form-item
			v-for="option in options"
			v-bind="filterOption(option)"
			:key="option.key"
			:class="[option.key, clsx(option.class ?? '')]"
		>
			<component :is="option.content()" />
		</a-form-item>
	</a-form>
</template>

<style lang="scss" scoped></style>
