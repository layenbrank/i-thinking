<script setup lang="ts">
import { database } from '@/database/database.ts'
import { timeSphere } from '@desktop-app/core'
import { message } from 'ant-design-vue'

defineOptions({
	name: 'setting-backup'
})

// 创建一次 input 元素，避免重复创建
const fileRef = ref<HTMLInputElement | null>(null)

function handleBackup() {
	// Logic for backup
	console.log('Backup initiated')
}
async function handleExport() {
	// Logic for export
	console.log('Export initiated')
	const applications = await database.application.toArray()

	const stringified = JSON.stringify(applications, null, 2)

	const blob = new Blob([stringified], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = `applications-backup-${timeSphere.now().format('YYYY年MM月DD日-HH时mm分ss秒')}.json`
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}

function handleImport() {
	const input = fileRef.value
	if (!input) return message.error('文件输入未初始化')

	// 重置 input 值，允许重复选择同一文件
	input.value = ''

	// 移除旧的事件监听器（如果存在），然后添加新的
	input.removeEventListener('change', handleChange)
	input.addEventListener('change', handleChange, { once: true })

	input.removeEventListener('cancel', handleCancel)
	input.addEventListener('cancel', handleCancel, { once: true })

	input.click()
}

// 读取文件的辅助函数，避免重复创建 FileReader 事件监听器
async function readFile(file: File): Promise<string> {
	return new Promise(function (resolve, reject) {
		const reader = new FileReader()

		reader.addEventListener(
			'load',
			function (e) {
				const result = e.target?.result as string
				if (result) resolve(result)
				else reject(new Error('文件读取失败'))
			},
			{ once: true }
		)

		reader.addEventListener(
			'error',
			function () {
				reject(new Error('文件读取失败'))
			},
			{ once: true }
		)

		reader.readAsText(file)
	})
}

// 使用 once 选项，确保事件监听器只执行一次
async function handleChange(event: Event) {
	const target = event.target as HTMLInputElement
	const files = target.files

	if (!files?.length) return message.error('未选择文件')

	console.log('files', files)

	// 处理所有文件
	for (const file of files) {
		if (!file) {
			continue
		}

		try {
			const result = await readFile(file)
			console.log('result', result)

			const imported = JSON.parse(result) as Application[]
			const isArray = Array.isArray(imported)
			if (!isArray) {
				message.error('无效的数据格式')
				continue
			}

			await database.application.bulkPut(imported)
			message.success('导入成功')
		} catch (error) {
			console.error('Error reading file:', error)
			message.error('导入失败：' + (error instanceof Error ? error.message : '未知错误'))
		}
	}
}

// 处理用户取消选择文件的情况
function handleCancel() {
	// 取消时不需要特殊处理
}

// 初始化 input 元素
onMounted(function () {
	const input = document.createElement('input')
	const DOMAttributes: Partial<HTMLInputElement> = {
		type: 'file',
		multiple: true,
		accept: 'application/json'
	}
	Object.assign(input, DOMAttributes)
	input.style.cssText = 'display:none;'
	document.body.appendChild(input)
	fileRef.value = input
})

// 组件卸载时清理资源
onUnmounted(function () {
	if (!fileRef.value) return
	if (!document.body.contains(fileRef.value)) return
	document.body.removeChild(fileRef.value)
	fileRef.value = null
})
</script>

<template>
	<div class="setting-backup">
		<a-button type="primary" @click="handleBackup">备份</a-button>
		<a-button type="primary" @click="handleExport">导出</a-button>
		<a-button type="primary" @click="handleImport">导入</a-button>
	</div>
</template>

<style lang="scss" scoped>
.setting-backup {
}
</style>
