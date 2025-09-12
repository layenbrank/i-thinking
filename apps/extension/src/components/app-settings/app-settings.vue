<script setup lang="ts">
import type { DrawerProps } from 'ant-design-vue'

interface AppDrawerProps extends Omit<DrawerProps, 'visible'> {
	application: Application | null
}

defineOptions({
	name: 'app-settings'
})

const props = withDefaults(defineProps<AppDrawerProps>(), {})

const emit = defineEmits<(e: 'update:confirm', value: any) => void>()

interface DirectionOptions {
	label: string
	value: ApplicationDirection
}

interface ShapeOptions {
	label: string
	value: ApplicationShape
}

interface SizeOptions {
	label: string
	value: ApplicationSize
}

interface Options {
	directions: DirectionOptions[]
	shapes: ShapeOptions[]
	sizes: SizeOptions[]
}

const options: Options = {
	directions: [
		{
			label: 'Horizontal',
			value: 'horizontal'
		},
		{
			label: 'vertical',
			value: 'vertical'
		}
	],
	shapes: [
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
	],
	sizes: [
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
}

const formState = reactive<Record<string, any>>({
	size: props.application?.size ?? 'medium',
	shape: 'circle',
	direction: 'horizontal'
})

watchEffect(function () {
	formState.size = props.application?.size ?? 'medium'
	formState.shape = props.application?.shape ?? 'circle'
	formState.direction = props.application?.direction ?? 'horizontal'
})

function onFinish(values: any) {
	console.log('Success:', values)
}

function onFinishFailed(errorInfo: any) {
	console.log('Failed:', errorInfo)
}
</script>

<template>
	<a-drawer v-bind="{ ...props }" root-class-name="app-settings">
		{{ application?.size }}
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
						v-for="size in options.sizes"
						:value="size.value"
						:key="size.value"
						:class="['size-radio', size.value]"
					>
						{{ size.label }}
					</a-radio-button>
				</a-radio-group>
			</a-form-item>

			<a-form-item name="shape" label="形状" class="app-shape-form-item">
				<a-radio-group v-model:value="formState.shape" class="shape-radio-group">
					<a-radio-button
						v-for="shape in options.shapes"
						:value="shape.value"
						:key="shape.value"
						:class="['shape-radio', shape.value]"
					>
						{{ shape.label }}
					</a-radio-button>
				</a-radio-group>
			</a-form-item>
			<a-form-item name="direction" label="方向" class="app-direction-form-item">
				<a-radio-group v-model:value="formState.direction" class="direction-radio-group">
					<a-radio-button
						v-for="direction in options.directions"
						:value="direction.value"
						:key="direction.value"
						:class="['direction-radio', direction.value]"
					>
						{{ direction.label }}
					</a-radio-button>
				</a-radio-group>
			</a-form-item>
			<a-form-item name="background" label="背景" class="app-background-form-item">
				<!-- <a-color-picker v-model:value="formState.background" /> -->
			</a-form-item>
		</a-form>
		<a-button @click="emit('update:confirm', formState)">确定</a-button>
	</a-drawer>
</template>

<style lang="scss" scoped>
.ant-drawer.app-settings {
	.app-drawer-form {
	}

	.app-shape-form-item {
		.ant-form-item-row {
		}

		.ant-form-item-control {
		}

		.ant-form-item-control-input {
		}

		:deep(.shape-radio-group) {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			grid-template-rows: repeat(1, 1fr);
			gap: 10px;
		}

		:deep(.shape-radio) {
			border: none;
			@apply shadow-lg rounded-full;

			&::before {
				content: none;
			}

			&.rectangle {
				.ant-radio-button {
				}
				span:not(.ant-radio-button) {
				}
			}

			&.square {
				.ant-radio-button {
				}
				span:not(.ant-radio-button) {
				}
			}

			&.circle {
				.ant-radio-button {
				}
				span:not(.ant-radio-button) {
				}
			}
		}
	}

	.app-size-form-item {
		.ant-form-item-row {
		}

		.ant-form-item-control {
		}

		.ant-form-item-control-input {
		}

		:deep(.size-radio-group) {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			grid-template-rows: repeat(3, 1fr);
			gap: 10px;
		}

		:deep(.size-radio) {
			border: none;
			@apply shadow-lg rounded-full;

			&::before {
				content: none;
			}
		}
	}

	.app-direction-form-item {
		.ant-form-item-row {
		}

		.ant-form-item-control {
		}

		.ant-form-item-control-input {
		}

		:deep(.direction-radio-group) {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			grid-template-rows: repeat(1, 1fr);
			gap: 10px;
		}

		:deep(.direction-radio) {
			border: none;
			@apply shadow-lg rounded-full;

			&::before {
				content: none;
			}
		}
	}
}
</style>
