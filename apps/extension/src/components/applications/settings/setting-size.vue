<script setup lang="ts">
import { useApplicationStore } from '@/stores/application'

defineOptions({
	name: 'setting-size'
})

interface SizeOptions {
	label: string
	value: Application.Size
}

const store = useApplicationStore()

const options: SizeOptions[] = [
	{
		label: 'Mini',
		value: 'mini'
	},
	{
		label: 'Small',
		value: 'small'
	},
	{
		label: 'Medium',
		value: 'medium'
	},
	{
		label: 'Large',
		value: 'large'
	},
	{
		label: 'Huge',
		value: 'huge'
	},
	{
		label: 'Massive',
		value: 'massive'
	},
	{
		label: 'Ultra',
		value: 'ultra'
	}
]

const formState = reactive<Record<string, any>>({
	size: store.activeApp?.size ?? 'medium',
	shape: 'circle',
	direction: 'horizontal'
})

watchEffect(function () {
	formState.size = store.activeApp?.size ?? 'medium'
	formState.shape = store.activeApp?.shape ?? 'circle'
	formState.direction = store.activeApp?.direction ?? 'horizontal'
})

function onFinish(values: any) {
	console.log('Success:', values)
}

function onFinishFailed(errorInfo: any) {
	console.log('Failed:', errorInfo)
}
</script>

<template>
	<div class="setting-size">
		<a-form
			:model="formState"
			name="validate_other"
			layout="vertical"
			@finishFailed="onFinishFailed"
			@finish="onFinish"
			class="app-drawer-form"
		>
			<a-form-item name="size" label="大小" class="app-size-form-item">
				<a-radio-group v-model:value="formState.size" class="size-radio-group">
					<a-radio-button
						v-for="size in options"
						:value="size.value"
						:key="size.value"
						:class="['size-radio', size.value]"
					>
						{{ size.label }}
					</a-radio-button>
				</a-radio-group>
			</a-form-item>
		</a-form>
	</div>
</template>

<style lang="scss" scoped></style>
