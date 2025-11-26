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

	input.addEventListener('change', function () {
		const files = input.files
		if (!files) return message.error('未选择文件')

		for (const file of files) {
			const reader = new FileReader()

			reader.addEventListener('load', async function (e) {
				try {
					const result = e.target?.result as string
					const imported = JSON.parse(result)
					const isArray = Array.isArray(imported)
					if (!isArray) return message.error('无效的数据格式')
					await database.application.bulkPut(imported)
					message.success('导入成功')
				} catch (error) {
					console.error('Error reading file:', error)
				}
			})
			if (!file) return message.error('未选择文件')
			reader.readAsText(file)
		}
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
