<script setup lang="ts">
import { useAppStore } from '@/stores/application-store.ts'

interface DirectionOptions {
	label: string
	value: ApplicationDirection
}

defineOptions({
	name: 'setting-direction'
})

const appStore = useAppStore()

const options: DirectionOptions[] = [
	{
		label: 'Horizontal',
		value: 'horizontal'
	},
	{
		label: 'vertical',
		value: 'vertical'
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
	<div class="setting-direction">
		<a-form
			:model="formState"
			name="validate_other"
			layout="vertical"
			@finishFailed="onFinishFailed"
			@finish="onFinish"
			class="app-drawer-form"
		>
			<a-form-item name="direction" label="方向" class="app-direction-form-item">
				<a-radio-group v-model:value="formState.direction" class="direction-radio-group">
					<a-radio-button
						v-for="direction in options"
						:value="direction.value"
						:key="direction.value"
						:class="['direction-radio', direction.value]"
					>
						{{ direction.label }}
					</a-radio-button>
				</a-radio-group>
			</a-form-item>
		</a-form>
	</div>
</template>

<style lang="scss" scoped></style>
