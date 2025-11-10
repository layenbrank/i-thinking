<script setup lang="ts">
import { message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'
defineOptions({
	name: 'clipchamp-view'
})

const canvasRef = useTemplateRef('canvasRef')
const videoRef = useTemplateRef('videoRef')
const isRecording = ref(false)
const isProcessing = ref(false)
const error = ref<string>('')
const currentCodecConfig = ref<any>(null)

// 存储流和编码器的引用，用于清理
let mediaStream: MediaStream | null = null
let videoEncoder: VideoEncoder | null = null
let audioProcessor: any = null
let videoProcessor: any = null
let frameCounter = 0

// 清理资源
function cleanupResources() {
	if (mediaStream) {
		mediaStream.getTracks().forEach((track) => track.stop())
		mediaStream = null
	}

	if (videoEncoder) {
		videoEncoder.close()
		videoEncoder = null
	}

	if (audioProcessor) {
		audioProcessor = null
	}

	if (videoProcessor) {
		videoProcessor = null
	}

	frameCounter = 0
	currentCodecConfig.value = null
}

// 检查浏览器支持
function checkBrowserSupport() {
	const errors = []

	if (!('VideoEncoder' in window)) {
		errors.push('VideoEncoder API 不受支持')
	}

	if (!('MediaStreamTrackProcessor' in window)) {
		errors.push('MediaStreamTrackProcessor API 不受支持')
	}

	if (!navigator.mediaDevices?.getUserMedia) {
		errors.push('getUserMedia API 不受支持')
	}

	if (errors.length > 0) {
		const errorMsg = `
当前浏览器不支持以下 API：
${errors.join('\n')}

请使用支持 WebCodecs API 的现代浏览器：
• Chrome 94+ / Edge 94+
• Firefox (实验性支持)
• Safari (部分支持)

建议使用最新版本的 Chrome 或 Edge 浏览器。
		`.trim()
		throw new Error(errorMsg)
	}

	console.log('浏览器支持检查通过')
}

async function handler() {
	try {
		// 检查浏览器支持
		checkBrowserSupport()

		// 如果正在处理，先停止
		if (isProcessing.value) {
			stopProcessing()
			return
		}

		isProcessing.value = true
		error.value = ''
		message.info('开始获取媒体流...')

		if (!canvasRef.value) {
			throw new Error('Canvas 元素未找到')
		}

		// 获取用户媒体流
		mediaStream = await navigator.mediaDevices.getUserMedia({
			video: {
				width: { ideal: 1920 },
				height: { ideal: 1080 },
				frameRate: { ideal: 30 }
			},
			audio: {
				sampleRate: 48000,
				channelCount: 2
			}
		})

		message.success('媒体流获取成功')

		const [audioTrack] = mediaStream.getAudioTracks()
		const [videoTrack] = mediaStream.getVideoTracks()

		if (!audioTrack || !videoTrack) {
			throw new Error('无法获取音频或视频轨道')
		}

		console.log('音频轨道:', audioTrack.getSettings())
		console.log('视频轨道:', videoTrack.getSettings())

		// 获取实际的视频轨道设置
		const videoSettings = videoTrack.getSettings()
		const actualWidth = videoSettings.width ?? 1280
		const actualHeight = videoSettings.height ?? 720

		// 配置视频编码器 - 使用多个备用方案（按兼容性排序）
		const codecConfigs = [
			// H.264 - 最广泛支持，MP4 容器常用编码
			{
				codec: 'avc1.42E01E', // H.264 Baseline Profile (最大兼容性)
				width: actualWidth,
				height: actualHeight,
				bitrate: 2_000_000,
				framerate: 30,
				description: 'H.264 Baseline (MP4兼容)'
			},
			{
				codec: 'avc1.42001E', // H.264 Baseline Profile 备用
				width: actualWidth,
				height: actualHeight,
				bitrate: 1_500_000,
				framerate: 30,
				description: 'H.264 备用配置'
			},
			{
				codec: 'avc1.4D001E', // H.264 Main Profile (更好压缩)
				width: actualWidth,
				height: actualHeight,
				bitrate: 1_800_000,
				framerate: 30,
				description: 'H.264 Main Profile'
			},
			{
				codec: 'avc1.64001E', // H.264 High Profile (最佳质量)
				width: actualWidth,
				height: actualHeight,
				bitrate: 2_500_000,
				framerate: 30,
				description: 'H.264 High Profile'
			},
			// VP8 - WebM 容器常用，广泛支持
			{
				codec: 'vp8',
				width: actualWidth,
				height: actualHeight,
				bitrate: 1_200_000,
				framerate: 30,
				description: 'VP8 (WebM兼容)'
			},
			// VP9 - 现代 WebM 编码
			{
				codec: 'vp09.00.10.08',
				width: actualWidth,
				height: actualHeight,
				bitrate: 1_000_000,
				framerate: 30,
				description: 'VP9 (现代WebM)'
			},
			// 低分辨率备用方案
			{
				codec: 'avc1.42E01E',
				width: Math.min(actualWidth, 1280),
				height: Math.min(actualHeight, 720),
				bitrate: 1_000_000,
				framerate: 30,
				description: 'H.264 720p备用'
			},
			{
				codec: 'vp8',
				width: Math.min(actualWidth, 854),
				height: Math.min(actualHeight, 480),
				bitrate: 600_000,
				framerate: 30,
				description: 'VP8 480p备用'
			}
		]

		let codecConfig = null

		// 尝试找到支持的编码器配置
		for (const config of codecConfigs) {
			try {
				const encoderSupport = await VideoEncoder.isConfigSupported(config)
				if (encoderSupport.supported) {
					codecConfig = config
					console.log('选择的编码器配置:', config)
					message.success(`编码器选择成功: ${config.description}`)
					break
				} else {
					console.log(`编码器不支持: ${config.description}`)
				}
			} catch (err) {
				console.warn(`编码器 ${config.codec} 检查失败:`, err)
			}
		}

		if (!codecConfig) {
			throw new Error(
				'没有找到支持的视频编码器配置，请尝试使用支持 WebCodecs API 的现代浏览器（如 Chrome 94+）'
			)
		}

		// 保存当前使用的编码器配置
		currentCodecConfig.value = codecConfig

		message.info('开始配置视频编码器...')

		// 创建视频编码器
		videoEncoder = new VideoEncoder({
			output(chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) {
				console.log('编码输出:', {
					type: chunk.type,
					timestamp: chunk.timestamp,
					duration: chunk.duration,
					byteLength: chunk.byteLength,
					metadata
				})

				// 这里可以将编码后的数据发送到服务器或保存到文件
				handleEncodedChunk(chunk, metadata)
			},
			error(error: DOMException) {
				console.error('视频编码错误:', error)
				message.error(`编码错误: ${error.message}`)
			}
		})

		// 配置编码器
		videoEncoder.configure(codecConfig)
		message.success('视频编码器配置完成')

		// 处理视频轨道
		await processVideoTrack(videoTrack)
	} catch (err) {
		console.error('处理错误:', err)
		const errorMsg = err instanceof Error ? err.message : '未知错误'
		error.value = errorMsg
		message.error(errorMsg)
		stopProcessing()
	}
}

// 处理视频轨道
async function processVideoTrack(videoTrack: MediaStreamTrack) {
	try {
		if (!videoEncoder) throw new Error('视频编码器未初始化')

		videoProcessor = new MediaStreamTrackProcessor(videoTrack)
		const reader = videoProcessor.readable.getReader()

		message.info('开始处理视频帧...')
		frameCounter = 0

		while (isProcessing.value) {
			const result = await reader.read()

			if (result.done) break

			const frame = result.value as VideoFrame

			try {
				// 检查编码器队列大小，避免过载
				if (videoEncoder.encodeQueueSize > 5) {
					console.warn('编码器队列过载，丢弃帧')
					frame.close()
					continue
				}

				frameCounter++
				const insertKeyFrame = frameCounter % 30 === 0 // 每30帧插入一个关键帧

				// 编码视频帧
				videoEncoder.encode(frame, { keyFrame: insertKeyFrame })

				// 更新 Canvas 显示
				updateCanvasDisplay(frame)

				if (frameCounter % 100 === 0) console.log(`已处理 ${frameCounter} 帧`)
			} finally {
				// 确保释放帧资源
				frame.close()
			}
		}

		reader.releaseLock()
		message.success('视频处理完成')
	} catch (err) {
		console.error('视频处理错误:', err)
		throw err
	}
}

// 处理编码后的数据块
function handleEncodedChunk(chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) {
	// 创建一个 ArrayBuffer 来存储数据
	const buffer = new ArrayBuffer(chunk.byteLength)
	chunk.copyTo(buffer)

	console.log('编码数据块:', {
		timestamp: chunk.timestamp,
		type: chunk.type,
		size: chunk.byteLength,
		metadata
	})

	// 这里可以实现具体的数据处理逻辑：
	// 1. 保存到 IndexedDB
	// 2. 发送到服务器
	// 3. 写入文件系统 (如果支持 File System Access API)
	// 4. 打包为 MP4/WebM 容器格式

	// 示例: 收集编码数据用于后续打包
	collectEncodedData(chunk, buffer)
}

// 收集编码数据（用于演示如何组装成完整视频文件）
const encodedChunks: { chunk: EncodedVideoChunk; buffer: ArrayBuffer }[] = []

function collectEncodedData(chunk: EncodedVideoChunk, buffer: ArrayBuffer) {
	// 在实际应用中，你可以：
	// 1. 使用 MP4Box.js 将 H.264 数据打包为 MP4
	// 2. 使用 WebM Writer 将 VP8/VP9 数据打包为 WebM
	// 3. 发送到服务器进行容器封装

	encodedChunks.push({ chunk, buffer })

	// 限制内存使用，只保留最近的100个块
	if (encodedChunks.length > 100) encodedChunks.shift()

	console.log(
		`已收集 ${encodedChunks.length} 个编码块，可用于生成 ${currentCodecConfig.value?.codec.startsWith('avc') ? 'MP4' : 'WebM'} 文件`
	)
}

// 更新 Canvas 显示
function updateCanvasDisplay(frame: VideoFrame) {
	if (!canvasRef.value) return

	const ctx = canvasRef.value.getContext('2d')
	if (!ctx) return

	canvasRef.value.width = frame.displayWidth
	canvasRef.value.height = frame.displayHeight
	ctx.drawImage(frame, 0, 0)
}

// 停止处理
function stopProcessing() {
	isProcessing.value = false
	isRecording.value = false

	message.info('正在停止处理...')
	cleanupResources()
	message.success('处理已停止')
}

// 开始/停止录制
async function toggleRecording() {
	if (isRecording.value) {
		stopProcessing()
	} else {
		isRecording.value = true
		await handler()
	}
}

// 测试浏览器支持
async function testBrowserSupport() {
	try {
		checkBrowserSupport()

		// 测试编码器支持
		const testConfigs = [
			{
				codec: 'avc1.42E01E',
				width: 640,
				height: 480,
				bitrate: 1000000,
				framerate: 30,
				name: 'H.264 Baseline (MP4兼容)'
			},
			{
				codec: 'avc1.4D001E',
				width: 640,
				height: 480,
				bitrate: 1000000,
				framerate: 30,
				name: 'H.264 Main Profile'
			},
			{
				codec: 'avc1.64001E',
				width: 640,
				height: 480,
				bitrate: 1000000,
				framerate: 30,
				name: 'H.264 High Profile'
			},
			{
				codec: 'vp8',
				width: 640,
				height: 480,
				bitrate: 1000000,
				framerate: 30,
				name: 'VP8 (WebM兼容)'
			},
			{
				codec: 'vp09.00.10.08',
				width: 640,
				height: 480,
				bitrate: 1000000,
				framerate: 30,
				name: 'VP9 (现代WebM)'
			}
		]

		const supportedCodecs = []
		const unsupportedCodecs = []

		for (const config of testConfigs) {
			try {
				const support = await VideoEncoder.isConfigSupported(config)
				if (support.supported) supportedCodecs.push(config.name)
				else unsupportedCodecs.push(config.name)
			} catch (err) {
				console.warn(`测试 ${config.name} 失败:`, err)
				unsupportedCodecs.push(config.name)
			}
		}

		if (supportedCodecs.length > 0) {
			const supportInfo = `
✅ 支持的编码器 (${supportedCodecs.length}个):
${supportedCodecs.map((name) => `• ${name}`).join('\n')}

${
	unsupportedCodecs.length > 0
		? `❌ 不支持的编码器:
${unsupportedCodecs.map((name) => `• ${name}`).join('\n')}`
		: ''
}

💡 编码格式说明:
• H.264 → 可打包为 MP4 文件
• VP8/VP9 → 可打包为 WebM 文件
			`.trim()

			message.success({
				content: supportInfo,
				duration: 3
			})
		} else {
			message.warning('浏览器API支持，但没有找到支持的视频编码器')
		}
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : '未知错误'
		message.error(errorMsg)
		error.value = errorMsg
	}
}

// 初始化视频预览
function initVideoPreview() {
	if (!videoRef.value) return

	try {
		videoRef.value.play()
	} catch (err) {
		console.warn('视频预览初始化失败:', err)
	}
}
onMounted(function () {
	initVideoPreview()
})

onUnmounted(function () {
	cleanupResources()
})
</script>

<template>
	<div class="clipchamp-view">
		<!-- 控制面板 -->
		<div class="control-panel">
			<a-space>
				<a-button type="primary" :loading="isProcessing" @click="toggleRecording">
					{{ isRecording ? '停止录制' : '开始录制' }}
				</a-button>

				<a-button v-if="isProcessing" danger @click="stopProcessing"> 强制停止 </a-button>

				<a-button @click="testBrowserSupport" :disabled="isProcessing"> 测试浏览器支持 </a-button>

				<a-tag v-if="isProcessing" color="processing"> 处理中... </a-tag>

				<a-tag v-if="isRecording" color="red"> 录制中 </a-tag>
			</a-space>

			<!-- 错误显示 -->
			<a-alert
				v-if="error"
				:message="error"
				type="error"
				closable
				@close="error = ''"
				style="margin-top: 8px"
			/>
		</div>

		<!-- 视频显示区域 -->
		<div class="clipchamp-wrap">
			<div class="video-container">
				<h3>原始视频</h3>
				<video ref="videoRef" src="" controls loop></video>
			</div>

			<div class="canvas-container">
				<h3>处理后的画面</h3>
				<canvas ref="canvasRef" class="processed-canvas"></canvas>
				<div class="frame-info" v-if="isProcessing">已处理帧数: {{ frameCounter }}</div>
			</div>
		</div>

		<!-- 状态信息 -->
		<div class="status-panel" v-if="mediaStream || currentCodecConfig">
			<a-descriptions title="系统信息" :column="2" size="small">
				<!-- <a-descriptions-item label="视频轨道" v-if="mediaStream">
					{{ mediaStream.getVideoTracks().length > 0 ? '已连接' : '未连接' }}
				</a-descriptions-item>
				<a-descriptions-item label="音频轨道" v-if="mediaStream">
					{{ mediaStream.getAudioTracks().length > 0 ? '已连接' : '未连接' }}
				</a-descriptions-item> -->
				<a-descriptions-item label="编码器" v-if="currentCodecConfig">
					{{ currentCodecConfig.codec }}
				</a-descriptions-item>
				<a-descriptions-item label="输出格式" v-if="currentCodecConfig">
					{{ currentCodecConfig.codec.startsWith('avc') ? 'MP4兼容' : 'WebM兼容' }}
				</a-descriptions-item>
				<a-descriptions-item label="分辨率" v-if="currentCodecConfig">
					{{ currentCodecConfig.width }}×{{ currentCodecConfig.height }}
				</a-descriptions-item>
				<a-descriptions-item label="码率" v-if="currentCodecConfig">
					{{ Math.round(currentCodecConfig.bitrate / 1000) }}K
				</a-descriptions-item>
				<a-descriptions-item label="帧率" v-if="currentCodecConfig">
					{{ currentCodecConfig.framerate }}fps
				</a-descriptions-item>
				<a-descriptions-item label="描述" v-if="currentCodecConfig">
					{{ currentCodecConfig.description }}
				</a-descriptions-item>
			</a-descriptions>

			<!-- 格式说明 -->
			<a-alert message="格式说明" type="info" style="margin-top: 12px">
				<template #description>
					<div style="font-size: 12px; line-height: 1.5">
						• <strong>H.264</strong> 编码 → 可封装为 <strong>MP4</strong> 文件格式<br />
						• <strong>VP8/VP9</strong> 编码 → 可封装为 <strong>WebM</strong> 文件格式<br />
						• 当前输出:
						<strong>
							{{ currentCodecConfig?.codec.startsWith('avc') ? 'MP4兼容' : 'WebM兼容' }}
						</strong>
						编码数据
					</div>
				</template>
			</a-alert>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.clipchamp-view {
	width: 100%;
	height: 100%;
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 16px;

	.control-panel {
		background: #f5f5f5;
		padding: 16px;
		border-radius: 8px;
		border: 1px solid #d9d9d9;
	}

	.clipchamp-wrap {
		flex: 1;
		display: flex;
		gap: 16px;
		min-height: 0;

		.video-container,
		.canvas-container {
			flex: 1;
			display: flex;
			flex-direction: column;
			border: 1px solid #d9d9d9;
			border-radius: 8px;
			padding: 16px;
			background: #fff;

			h3 {
				margin: 0 0 12px 0;
				font-size: 16px;
				font-weight: 500;
				color: #262626;
			}
		}

		.video-container {
			video {
				width: 100%;
				max-height: 400px;
				border-radius: 4px;
				background: #000;
			}
		}

		.canvas-container {
			.processed-canvas {
				width: 100%;
				max-height: 400px;
				border: 1px solid #d9d9d9;
				border-radius: 4px;
				background: #f5f5f5;
			}

			.frame-info {
				margin-top: 8px;
				padding: 4px 8px;
				background: #e6f7ff;
				border: 1px solid #91d5ff;
				border-radius: 4px;
				font-size: 12px;
				color: #0050b3;
			}
		}
	}

	.status-panel {
		background: #fff;
		padding: 16px;
		border: 1px solid #d9d9d9;
		border-radius: 8px;
	}
}

@media (max-width: 768px) {
	.clipchamp-view {
		.clipchamp-wrap {
			flex-direction: column;
		}
	}
}
</style>
