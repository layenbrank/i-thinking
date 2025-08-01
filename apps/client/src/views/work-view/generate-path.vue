<script setup lang="tsx">
import { readDir } from '@tauri-apps/plugin-fs'
import { open as showOpenDialog } from '@tauri-apps/plugin-dialog'

import { Button, Input, message } from 'ant-design-vue'

import ReForm, { type FormOptions } from '@/components/re-form.vue'

import { useDirs } from '@/hooks/files.ts'

defineOptions({
	name: 'generate-path'
})

const formOptions = reactive<FormOptions[]>([])

const { dirPath, showDirDialog, recursionDirs, dirPaths } = useDirs()

async function handleSelectFolder(key: string) {
	const dirPath = await showOpenDialog({
		directory: true
	})

	if (!dirPath) return

	for (const option of formOptions) {
		if (option.key !== key) continue
		option.value = dirPath ?? ''
	}
}

function handleIncrement() {
	const form = {
		label: `路径-${formOptions.length + 1}`,
		key: `path-${formOptions.length + 1}`,
		value: '',
		unwatch: null,
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
					{this.value && <Button onClick={() => handleSelectFolder(this.key)}>选择目录</Button>}
					{!this.value && <Button onClick={() => handleSelectFolder(this.key)}>-</Button>}
				</>
			)
		}
	}

	formOptions.push(form)
}

function handleDecrement() {
	formOptions.pop()
}

onMounted(function () {
	handleIncrement()
})
</script>

<template>
	<div class="generate-path">
		<ReForm
			:model="formOptions"
			name="dynamic-rule"
			:labelCol="{ span: 4 }"
			:wrapperCol="{ span: 12 }"
			:options="formOptions"
			class="generate-path-form"
		/>
		<a-button @click="handleIncrement">递增</a-button>
	</div>
</template>

<style lang="scss" scoped>
.generate-path {
	&-form {
	}

	:deep(.ant-form-item) {
		&[class*='path-'] {
			.ant-row {
			}

			.ant-col {
			}

			.ant-form-item-control-input {
				&-content {
					@apply flex flex-row gap-x-2;
				}
			}
		}
	}
}
</style>
