<script setup lang="tsx">
import { Button, Input } from 'ant-design-vue'
import ReForm, { type FormOptions } from '@/components/re-form.vue'

defineOptions({
	name: 'monitor-changes'
})

const formRef = useTemplateRef('formRef')

const formOptions = reactive<FormOptions[]>([
	{
		label: '路径-1',
		key: 'path',
		value: 'C:\\Users\\Administrator\\Desktop',
		content() {
			return (
				<>
					<Input
						value={this.value}
						onUpdate:value={(value: string) => {
							this.value = value
							console.log('value', this.value)
						}}
					></Input>
					<Button onClick={handleSelectFolder}>选择目录</Button>
				</>
			)
		}
	}
])

function handleSelectFolder() {
	window.ipcRenderer.send('monitor-changes')
}

window.ipcRenderer.on('monitor-changes', function (e, folderPath: string, paths: string[]) {
	console.log('e', e, 'folderPath', folderPath, 'paths', paths)
})
</script>

<template>
	<div class="monitor-changes">
		<ReForm
			ref="formRef"
			:model="formOptions"
			name="dynamic-rule"
			:labelCol="{ span: 4 }"
			:wrapperCol="{ span: 12 }"
			:options="formOptions"
			class="monitor-changes-form"
		/>
	</div>
</template>

<style lang="scss" scoped>
.monitor-changes {
	&-form {
	}

	:deep(.ant-form-item) {
		&.path {
			.ant-row {
			}

			.ant-col {
			}

			.ant-form-item-control-input {
				&-content {
					@apply flex;
				}
			}
		}
	}
}
</style>
