<script setup lang="ts">
import { database } from '@/database/database.ts'
import { timeSphere } from '@desktop-app/core'
import { message } from 'ant-design-vue'

defineOptions({
	name: 'setting-backup'
})

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
	// Logic for import
	console.log('Import initiated')
	const input = document.createElement('input')
	input.type = 'file'
	input.accept = 'application/json'
	input.style.display = 'none'

	document.body.appendChild(input)

	input.click()

	input.addEventListener('change', async function () {
		const files = input.files
		if (!files || files.length === 0) {
			document.body.removeChild(input)
			return message.error('未选择文件')
		}

		const [file] = files
		if (!file) {
			document.body.removeChild(input)
			return message.error('未选择文件')
		}

		const reader = new FileReader()

		reader.addEventListener('load', async function (e) {
			try {
				const result = e.target?.result as string
				if (!result) {
					document.body.removeChild(input)
					return message.error('文件读取失败')
				}

				const imported = JSON.parse(result)
				const isArray = Array.isArray(imported)
				if (!isArray) {
					document.body.removeChild(input)
					return message.error('无效的数据格式')
				}

				await database.application.bulkPut(imported)
				message.success('导入成功')
			} catch (error) {
				console.error('Error reading file:', error)
				message.error('导入失败：' + (error instanceof Error ? error.message : '未知错误'))
			} finally {
				document.body.removeChild(input)
			}
		})

		reader.addEventListener('error', function () {
			document.body.removeChild(input)
			message.error('文件读取失败')
		})

		reader.readAsText(file)
	})

	// 处理用户取消选择文件的情况
	input.addEventListener('cancel', function () {
		document.body.removeChild(input)
	})
}
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
