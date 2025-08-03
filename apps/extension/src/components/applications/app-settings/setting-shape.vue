<script setup lang="ts">
import { useAppStore } from '@/stores/application-store.ts'

interface ShapeOptions {
	label: string
	value: ApplicationShape
}

defineOptions({
	name: 'setting-shape'
})

const appStore = useAppStore()

const options: ShapeOptions[] = [
	{
		label: 'Circle',
		value: 'circle'
	},
	{
		label: 'Square',
		value: 'square'
	},
	{
		label: 'Rectangle',
		value: 'rectangle'
	}
]

const formState = reactive<Record<string, any>>({
	size: appStore.activeApp?.size || 'medium',
	shape: 'circle',
	direction: 'horizontal'
})

function onFinish(values: any) {
	console.log('Success:', values)
}

function onFinishFailed(errorInfo: any) {
	console.log('Failed:', errorInfo)
}
</script>

<template>
	<div class="setting-shape">
		<a-form
			:model="formState"
			name="validate_other"
			layout="vertical"
			@finishFailed="onFinishFailed"
			@finish="onFinish"
			class="app-drawer-form"
		>
			<a-form-item name="shape" label="形状" class="app-shape-form-item">
				<a-radio-group v-model:value="formState.shape" class="shape-radio-group">
					<a-radio-button
						v-for="shape in options"
						:value="shape.value"
						:key="shape.value"
						:class="['shape-radio', shape.value]"
					>
						{{ shape.label }}
					</a-radio-button>
				</a-radio-group>
			</a-form-item>
		</a-form>
	</div>
</template>

<style lang="scss" scoped></style>
