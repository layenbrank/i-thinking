<script setup lang="ts">
import { http } from '@/utils/http.ts'
import { computed, ref, useTemplateRef } from 'vue'

// 定义类型
type UploadStatus = 'idle' | 'uploading' | 'completed' | 'error'
type ChunkStatus = 'pending' | 'uploading' | 'completed' | 'error'

export interface PrepareResponse {
	uploadId: string
	fileExists: boolean
	uploadedChunks: any[]
	uploadUrl: string
}

export interface Response<T> {
	code: number
	success: boolean
	msg: string
	data: T
	timestamp: number
}

export interface FinalizeResponse {
	success: boolean
	fileUrl: string
	fileId: string
}

export interface ChunkResponse {
	success: boolean
	chunkIndex: number
	message: string
}

interface Chunk {
	offset: number // 开始上传位置
	end: number // 结束上传位置
	index: number
	status: ChunkStatus
	size: number
	retries: number
}

interface LogItem {
	id: string
	timestamp: string
	message: string
	type: 'info' | 'success' | 'error'
}

defineOptions({
	name: 'upload-view'
})

const fileInputRef = useTemplateRef('fileInputRef')

// 响应式状态
const file = ref<File | null>(null)
const chunks = ref<Chunk[]>([])
const uploadId = ref<string | null>(null)
const isUploading = ref(false)
const isPaused = ref(false)
const uploadedChunks = ref(new Set<number>())
const failedChunks = ref(new Set<number>())
const uploadTime = ref<number | null>(null)
const uploadedBytes = ref(0)
const indicator = ref<UploadStatus>('idle')
const progress = ref(0)
const uploadSpeed = ref('0 KB/s')
const fileHash = ref('')
const logs = ref<LogItem[]>([])
const isDragOver = ref(false)

// 配置
const chunkSize = ref(2 * 1024 * 1024) // 2MB
const concurrency = ref(3)
const retryCount = ref(3)

// 选项配置
const chunkSizeOptions = [1, 2, 5, 10] // MB
const concurrencyOptions = [1, 2, 3, 5] // 个数
const retryCountOptions = [1, 3, 5] // 次数

// 计算属性
const fileInfo = computed(function () {
	if (!file.value) return null
	return {
		name: file.value.name,
		size: formatFileSize(file.value.size),
		type: file.value.type || '未知',
		hash: fileHash.value || '计算中...'
	}
})

const isFileSelected = computed(() => file.value !== null)

const canBegin = computed(() => isFileSelected.value && !isUploading.value)
const canPause = computed(() => isUploading.value)
const canCancel = computed(() => isFileSelected.value)

const buttonText = computed(function () {
	if (isUploading.value) return '上传中...'
	if (isPaused.value && uploadedChunks.value.size > 0) return '继续上传'
	return '开始上传'
})

// 事件处理函数
function handleFile() {
	const clickEvent = new MouseEvent('click', {
		bubbles: true,
		cancelable: true
	})
	fileInputRef.value?.dispatchEvent(clickEvent)
}

function handleDragOver(_e: DragEvent) {
	isDragOver.value = true
}

function handleDragLeave(_e: DragEvent) {
	isDragOver.value = false
}

function handleDrop(e: DragEvent) {
	isDragOver.value = false
	const dataTransfer = e.dataTransfer
	if (!dataTransfer?.files.length) return

	const [file] = dataTransfer.files
	void handleFileSelect(file)
}

function handleFileChange(e: Event) {
	const target = e.target as HTMLInputElement
	if (!target.files?.length) return
	const [file] = target.files
	void handleFileSelect(file)
}

async function handleFileSelect(value?: File) {
	if (!value) return
	file.value = value
	logger(`选择文件: ${value.name}`, 'info')

	// 计算文件哈希
	fileHash.value = '计算中...'
	const hash = await calculateFileHash(value)
	fileHash.value = hash

	// 计算分片
	buildChunks()

	logger(`文件哈希: ${hash}`, 'info')
	logger(`分片大小: ${formatFileSize(chunkSize.value)}`, 'info')
	logger(`分片数量: ${chunks.value.length}`, 'info')
}

function buildChunks() {
	chunks.value = []
	if (!file.value) return

	const totalChunks = Math.ceil(file.value.size / chunkSize.value)

	for (let i = 0; i < totalChunks; i++) {
		const offset = i * chunkSize.value
		const end = Math.min(offset + chunkSize.value, file.value.size)

		chunks.value.push({
			index: i,
			offset: offset,
			end: end,
			size: end - offset,
			status: 'pending',
			retries: 0
		})
	}
}

function findStatusText(status: string): string {
	const statusMap: Record<string, string> = {
		pending: '等待',
		uploading: '上传中',
		completed: '完成',
		error: '失败'
	}
	return statusMap[status] ?? '未知'
}

async function calculateFileHash(file: File): Promise<string> {
	return new Promise(function (resolve) {
		const reader = new FileReader()
		reader.onload = async (e) => {
			const buffer = e.target?.result as ArrayBuffer
			const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
			const hashArray = Array.from(new Uint8Array(hashBuffer))
			const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
			resolve(hashHex)
		}
		reader.readAsArrayBuffer(file)
	})
}

async function calculateChunkHash(chunk: Chunk): Promise<string> {
	if (!file.value) return ''
	const chunkBlob = file.value.slice(chunk.offset, chunk.end)
	const buffer = await chunkBlob.arrayBuffer()
	const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function beginUpload() {
	if (isUploading.value) return

	isUploading.value = true
	isPaused.value = false
	uploadTime.value = Date.now()
	uploadedBytes.value = 0

	updateStatus('uploading')
	logger('开始上传...', 'info')

	try {
		// 初始化上传
		const prepareResponse = await prepareUpload()
		if (!prepareResponse) {
			throw new Error('初始化上传失败')
		}

		uploadId.value = prepareResponse.uploadId

		if (prepareResponse.fileExists) {
			logger('文件已存在，秒传成功！', 'success')
			return completeUpload()
		}

		// 处理断点续传
		if (prepareResponse.uploadedChunks && prepareResponse.uploadedChunks.length > 0) {
			logger(`检测到已上传的分片: ${prepareResponse.uploadedChunks.length} 个`, 'info')
			prepareResponse.uploadedChunks.forEach(function (index: number) {
				uploadedChunks.value.add(index)
				if (!chunks.value[index]) return
				chunks.value[index].status = 'completed'
				uploadedBytes.value += chunks.value[index].size
			})
			updateProgress()
		}

		logger(`上传ID: ${uploadId.value}`, 'info')

		// 开始分片上传
		await uploadChunks()
	} catch (error: any) {
		logger(`上传失败: ${error.message}`, 'error')
		updateStatus('error')
		isUploading.value = false
	}
}

async function prepareUpload(): Promise<PrepareResponse> {
	return new Promise(function (resolve, reject) {
		http
			.post<Response<PrepareResponse>>('/upload/prepare', {
				fileName: file.value?.name,
				fileSize: file.value?.size,
				fileHash: fileHash.value,
				mimeType: file.value?.type,
				chunkSize: chunkSize.value
			})
			.subscribe({
				next(response) {
					resolve(response.data)
				},
				error(error) {
					reject(new Error(error.error ?? '初始化上传失败'))
				}
			})
	})
}

async function uploadChunks() {
	const pendingChunks = chunks.value.filter(
		(chunk) => chunk.status === 'pending' && !uploadedChunks.value.has(chunk.index)
	)

	// 使用并发池控制同时上传的分片数量
	const pool = []
	let index = 0

	async function uploadNext() {
		if (isPaused.value || index >= pendingChunks.length) {
			return
		}

		const chunk = pendingChunks[index++]
		if (!chunk) return
		await uploadChunk(chunk)

		if (!isPaused.value && index < pendingChunks.length) {
			await uploadNext()
		}
	}

	// 启动并发上传
	for (let i = 0; i < Math.min(concurrency.value, pendingChunks.length); i++) {
		pool.push(uploadNext())
	}

	await Promise.all(pool)

	// 检查是否所有分片都上传完成
	if (uploadedChunks.value.size === chunks.value.length && !isPaused.value) {
		await finalizeUpload()
	}
}

async function uploadChunk(chunk: Chunk) {
	if (isPaused.value) return

	chunk.status = 'uploading'
	updateChunkStatus(chunk)

	try {
		if (!file.value) return
		const chunkBlob = file.value.slice(chunk.offset, chunk.end)
		const chunkHash = await calculateChunkHash(chunk)

		const formData = new FormData()
		formData.append('uploadId', uploadId.value ?? '')
		formData.append('chunkIndex', chunk.index.toString())
		formData.append('chunkHash', chunkHash)
		formData.append('chunkData', chunkBlob)

		await new Promise<void>(function (resolve, reject) {
			http.post<Response<ChunkResponse>>('/upload/chunk', formData).subscribe({
				next() {
					chunk.status = 'completed'
					uploadedChunks.value.add(chunk.index)
					uploadedBytes.value += chunk.size

					updateChunkStatus(chunk)
					updateProgress()

					logger(`分片 ${chunk.index + 1} 上传完成`, 'success')
					resolve()
				},
				error(error) {
					reject(new Error(error.error ?? '分片上传失败'))
				}
			})
		})
	} catch (error: any) {
		chunk.retries++

		if (chunk.retries < retryCount.value) {
			logger(`分片 ${chunk.index + 1} 上传失败，重试 ${chunk.retries}/${retryCount.value}`, 'error')
			chunk.status = 'pending'
			await new Promise((resolve) => setTimeout(resolve, 1000)) // 等待1秒后重试
			await uploadChunk(chunk)
		} else {
			chunk.status = 'error'
			failedChunks.value.add(chunk.index)
			updateChunkStatus(chunk)
			logger(`分片 ${chunk.index + 1} 上传失败: ${error.message}`, 'error')
		}
	}
}

async function finalizeUpload() {
	try {
		logger('正在合并文件...', 'info')

		await new Promise<void>(function (resolve, reject) {
			http
				.post<Response<FinalizeResponse>>('/upload/finalize', {
					uploadId: uploadId.value
				})
				.subscribe({
					next(response) {
						logger('文件上传完成！', 'success')
						logger(`文件ID: ${response.data.fileId}`, 'info')
						completeUpload()
						resolve()
					},
					error(error) {
						reject(new Error(error.error ?? '完成上传失败'))
					}
				})
		})
	} catch (error: any) {
		logger(`完成上传失败: ${error.message}`, 'error')
		updateStatus('error')
	}
}

function completeUpload() {
	isUploading.value = false
	updateStatus('completed')
	progress.value = 100
}

function pauseUpload() {
	isPaused.value = true
	isUploading.value = false
	updateStatus('idle')
	logger('上传已暂停', 'info')
}

function cancelUpload() {
	isPaused.value = true
	isUploading.value = false

	if (uploadId.value) {
		try {
			http.delete(`/upload/cancel/${uploadId.value}`).subscribe({
				next() {
					logger('上传已取消', 'info')
				},
				error(error: any) {
					logger(`取消上传失败: ${error.message}`, 'error')
				}
			})
		} catch (error: any) {
			logger(`取消上传失败: ${error.message}`, 'error')
		}
	}

	clearUpload()
}

function clearUpload() {
	file.value = null
	chunks.value = []
	uploadId.value = null
	uploadedChunks.value.clear()
	failedChunks.value.clear()
	uploadedBytes.value = 0
	fileHash.value = ''

	if (fileInputRef.value) fileInputRef.value.value = ''

	updateStatus('idle')
	progress.value = 0
	uploadSpeed.value = '0 KB/s'
}

function updateChunkStatus(_chunk: { index: number; status: string }) {
	// Vue3 响应式：直接更新chunks数组中对应分片的状态
	// 由于chunk是chunks数组中的引用，状态已经自动更新
	// 不需要手动操作DOM，Vue会自动重渲染
}

function updateProgress() {
	progress.value = (uploadedChunks.value.size / chunks.value.length) * 100

	// 计算上传速度
	if (uploadTime.value && uploadedBytes.value > 0) {
		const elapsed = (Date.now() - uploadTime.value) / 1000
		const speed = uploadedBytes.value / elapsed
		uploadSpeed.value = `${formatFileSize(speed)}/s`
	}
}

function updateStatus(status: UploadStatus) {
	indicator.value = status
}

function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes'
	const k = 1024
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
	const index = Math.floor(Math.log(bytes) / Math.log(k))
	const unit = sizes[index]
	return `${parseFloat((bytes / Math.pow(k, index)).toFixed(2))} ${unit}`
}

function logger(msg: string, type: 'info' | 'success' | 'error' = 'info') {
	const timestamp = new Date().toLocaleTimeString()
	const logItem: LogItem = {
		id: `${Date.now()}-${Math.random()}`,
		timestamp,
		message: msg,
		type
	}

	logs.value.push(logItem)
	console.log(`[${type.toUpperCase()}] ${msg}`)
}
</script>

<template>
	<div class="upload-view">
		<div class="container">
			<h1>🚀 大文件分片上传</h1>

			<!-- 上传设置 -->
			<div class="settings">
				<h3>⚙️ 上传设置</h3>
				<div class="setting-row">
					<label>分片大小:</label>
					<select v-model="chunkSize" @change="buildChunks">
						<option v-for="mb in chunkSizeOptions" :key="mb" :value="mb * 1024 * 1024">
							{{ mb }} MB
						</option>
					</select>
				</div>
				<div class="setting-row">
					<label>并发数量:</label>
					<select v-model="concurrency">
						<option v-for="num in concurrencyOptions" :key="num" :value="num">{{ num }} 个</option>
					</select>
				</div>
				<div class="setting-row">
					<label>重试次数:</label>
					<select v-model="retryCount">
						<option v-for="count in retryCountOptions" :key="count" :value="count">
							{{ count }} 次
						</option>
					</select>
				</div>
			</div>

			<!-- 文件上传区域 -->
			<div
				:class="[
					'upload-area',
					{
						dragover: isDragOver
					},
					indicator
				]"
				@click="handleFile"
				@drop.prevent="handleDrop"
				@dragleave="handleDragLeave"
				@dragover.prevent="handleDragOver"
			>
				<div class="upload-icon">📁</div>
				<div class="upload-text">点击选择文件或拖拽文件到此处</div>
				<div class="upload-hint">支持任意格式文件，最大 5GB</div>
			</div>

			<!-- 隐藏的文件输入框 -->
			<input
				@change="handleFileChange"
				ref="fileInputRef"
				type="file"
				accept="*/*"
				style="display: none"
			/>

			<!-- 文件信息 -->
			<div v-if="fileInfo" class="file-info show">
				<div class="file-details">
					<div class="file-detail">
						<label>文件名:</label>
						<span>{{ fileInfo.name }}</span>
					</div>
					<div class="file-detail">
						<label>文件大小:</label>
						<span>{{ fileInfo.size }}</span>
					</div>
					<div class="file-detail">
						<label>文件类型:</label>
						<span>{{ fileInfo.type }}</span>
					</div>
					<div class="file-detail">
						<label>文件哈希:</label>
						<span>{{ fileInfo.hash }}</span>
					</div>
				</div>

				<!-- 进度条 -->
				<div class="progress-container">
					<div class="progress-bar">
						<div
							:style="{ width: `${progress}%` }"
							:class="[
								'progress-fill',
								{
									uploading: isUploading
								}
							]"
						></div>
					</div>
					<div class="progress-text">
						<span>{{ progress.toFixed(1) }}%</span>
						<span>{{ uploadSpeed }}</span>
					</div>
				</div>

				<!-- 分片信息 -->
				<div class="chunk-info">
					<div style="font-weight: 600; margin-bottom: 10px; color: #333">
						<span :class="['status-indicator', indicator]"></span>
						分片上传状态
					</div>
					<div class="chunk-list">
						<div
							v-for="chunk in chunks"
							:key="chunk.index"
							:id="`chunk-${chunk.index}`"
							class="chunk-item"
						>
							<span>分片 {{ chunk.index + 1 }}</span>
							<span>{{ formatFileSize(chunk.size) }}</span>
							<span :class="['chunk-status', chunk.status]">
								{{ findStatusText(chunk.status) }}
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- 控制按钮 -->
			<div class="controls">
				<button @click="beginUpload" :disabled="!canBegin" class="btn btn-primary">
					{{ buttonText }}
				</button>
				<button @click="pauseUpload" class="btn btn-secondary" :disabled="!canPause">
					暂停上传
				</button>
				<button @click="cancelUpload" class="btn btn-danger" :disabled="!canCancel">
					取消上传
				</button>
			</div>

			<!-- 日志 -->
			<div v-if="logs.length > 0" class="log-container show">
				<div style="font-weight: 600; margin-bottom: 10px; color: #333">📋 上传日志</div>
				<div class="log-list">
					<div v-for="log in logs" :key="log.id" :class="['log-item', log.type]">
						[{{ log.timestamp }}] {{ log.message }}
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
%size-full {
	width: 100%;
	height: 100%;
}

.upload-view {
	@extend %size-full;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20px;

	.container {
		background: white;
		border-radius: 20px;
		box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
		padding: 40px;
		width: 100%;
		max-width: 600px;
	}

	h1 {
		text-align: center;
		color: #333;
		margin-bottom: 30px;
		font-size: 2.5em;
		font-weight: 700;
	}

	.upload-area {
		border: 3px dashed #ddd;
		border-radius: 15px;
		padding: 40px;
		text-align: center;
		margin-bottom: 30px;
		transition: all 0.3s ease;
		cursor: pointer;
		position: relative;
		overflow: hidden;

		&:hover,
		&.dragover {
			border-color: #667eea;
			background: rgba(102, 126, 234, 0.05);
			transform: translateY(-2px);
		}

		&:hover .upload-icon {
			color: #667eea;
		}
	}

	.upload-icon {
		font-size: 4em;
		color: #ddd;
		margin-bottom: 20px;
		transition: color 0.3s ease;
	}

	.upload-text {
		font-size: 1.2em;
		color: #666;
		margin-bottom: 15px;
	}

	.upload-hint {
		font-size: 0.9em;
		color: #999;
	}

	#fileInput {
		display: none;
	}

	.file-info {
		background: #f8f9fa;
		border-radius: 10px;
		padding: 20px;
		margin-bottom: 20px;
		display: none;

		&.show {
			display: block;
		}
	}

	.file-details {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 15px;
		margin-bottom: 20px;
	}

	.file-detail {
		display: flex;
		justify-content: space-between;
		align-items: center;

		label {
			font-weight: 600;
			color: #555;
		}

		span {
			color: #777;
			font-family: monospace;
		}
	}

	.progress-container {
		margin-bottom: 20px;
	}

	.progress-bar {
		width: 100%;
		height: 12px;
		background: #e9ecef;
		border-radius: 6px;
		overflow: hidden;
		margin-bottom: 10px;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #667eea, #764ba2);
		width: 0%;
		transition: width 0.3s ease;
		border-radius: 6px;
	}

	.progress-text {
		display: flex;
		justify-content: space-between;
		font-size: 0.9em;
		color: #666;
	}

	.chunk-info {
		background: #fff;
		border: 1px solid #e9ecef;
		border-radius: 8px;
		padding: 15px;
		margin-top: 15px;
		max-height: 200px;
		overflow-y: auto;
	}

	.chunk-list {
		max-height: 150px;
		overflow-y: auto;
	}

	.chunk-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 5px 0;
		border-bottom: 1px solid #f0f0f0;

		&:last-child {
			border-bottom: none;
		}
	}

	.chunk-status {
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 0.8em;
		font-weight: 600;

		&.pending {
			background: #fff3cd;
			color: #856404;
		}

		&.uploading {
			background: #d1ecf1;
			color: #0c5460;
		}

		&.completed {
			background: #d4edda;
			color: #155724;
		}

		&.error {
			background: #f8d7da;
			color: #721c24;
		}
	}

	.controls {
		display: flex;
		gap: 15px;
		justify-content: center;
		margin-top: 20px;
	}

	.btn {
		padding: 12px 30px;
		border: none;
		border-radius: 8px;
		font-size: 1em;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		text-transform: uppercase;
		letter-spacing: 1px;

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
	}

	.btn-primary {
		background: linear-gradient(135deg, #667eea, #764ba2);
		color: white;

		&:hover:not(:disabled) {
			transform: translateY(-2px);
			box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
		}
	}

	.btn-secondary {
		background: #6c757d;
		color: white;

		&:hover:not(:disabled) {
			background: #5a6268;
			transform: translateY(-2px);
		}
	}

	.btn-danger {
		background: #dc3545;
		color: white;

		&:hover:not(:disabled) {
			background: #c82333;
			transform: translateY(-2px);
		}
	}

	.log-container {
		background: #f8f9fa;
		border-radius: 8px;
		padding: 15px;
		margin-top: 20px;
		max-height: 300px;
		overflow-y: auto;
		font-family: monospace;
		font-size: 0.9em;
		display: none;

		&.show {
			display: block;
		}
	}

	.log-list {
		max-height: 250px;
		overflow-y: auto;
	}

	.log-item {
		margin-bottom: 5px;
		padding: 2px 0;

		&.error {
			color: #dc3545;
		}

		&.success {
			color: #28a745;
		}

		&.info {
			color: #17a2b8;
		}
	}

	.settings {
		background: #f8f9fa;
		border-radius: 8px;
		padding: 20px;
		margin-bottom: 20px;

		h3 {
			margin-bottom: 15px;
			color: #333;
		}
	}

	.setting-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;

		label {
			font-weight: 600;
			color: #555;
		}

		input,
		select {
			padding: 5px 10px;
			border: 1px solid #ddd;
			border-radius: 4px;
			width: 150px;
		}
	}

	@keyframes pulse {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
		100% {
			opacity: 1;
		}
	}

	.uploading {
		.progress-fill {
			animation: pulse 1.5s ease-in-out infinite;
		}
	}

	.status-indicator {
		display: inline-block;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		margin-right: 8px;

		&.idle {
			background: #6c757d;
		}

		&.uploading {
			background: #17a2b8;
			animation: pulse 1s ease-in-out infinite;
		}

		&.completed {
			background: #28a745;
		}

		&.error {
			background: #dc3545;
		}
	}

	@media (max-width: 768px) {
		.container {
			padding: 20px;
			margin: 10px;
		}

		.file-details {
			grid-template-columns: 1fr;
		}

		.controls {
			flex-direction: column;
		}

		.btn {
			width: 100%;
		}
	}
}
</style>
