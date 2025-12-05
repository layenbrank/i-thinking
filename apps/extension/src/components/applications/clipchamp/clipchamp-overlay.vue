<script setup lang="ts">
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { message } from 'ant-design-vue'

defineOptions({
	name: 'clipchamp-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()

const canvasRef = useTemplateRef('canvasRef')
const videoRef = useTemplateRef('videoRef')
const ffmpeg = new FFmpeg()
let stream: MediaStream | null = null
let videoEncoder: VideoEncoder | null = null
const configure = ref<VideoEncoderConfig | null>(null)
const isRecording = ref(false)
const isProcessing = ref(false)
let audioProcessor: TransformStream<AudioData, AudioData> | null = null
let videoProcessor: TransformStream<VideoFrame, VideoFrame> | null = null
let frameCounter = 0

// 收集编码数据（用于演示如何组装成完整视频文件）
const encodedChunks: { chunk: EncodedVideoChunk; buffer: ArrayBuffer }[] = []

async function bootstrap() {
	message.info('开始获取媒体流...')

	isProcessing.value = true

	if (!canvasRef.value) throw new Error('Canvas 元素未找到')

	stream = await navigator.mediaDevices.getUserMedia({
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

	const [videoTrack] = stream.getVideoTracks()
	const [audioTrack] = stream.getAudioTracks()

	if (!audioTrack) throw new Error('无法获取音频轨道')
	if (!videoTrack) throw new Error('无法获取视频轨道')

	const videoSettings = videoTrack.getSettings()
	const audioSettings = audioTrack.getSettings()

	console.log('音频轨道:', audioSettings)
	console.log('视频轨道:', videoSettings)

	const actualWidth = videoSettings.width ?? 1280
	const actualHeight = videoSettings.height ?? 720

	// 配置视频编码器 - 使用多个备用方案（按兼容性排序）
	const configures: VideoEncoderConfig[] = [
		// H.264 - 最广泛支持，MP4 容器常用编码
		{
			// H.264 Baseline Profile (最大兼容性)
			codec: 'avc1.42E01E',
			width: actualWidth,
			height: actualHeight,
			bitrate: 2_000_000,
			framerate: 30
			// description: 'H.264 Baseline (MP4兼容)'
		},
		{
			// H.264 Baseline Profile 备用
			codec: 'avc1.42001E',
			width: actualWidth,
			height: actualHeight,
			bitrate: 1_500_000,
			framerate: 30
			// description: 'H.264 备用配置'
		},
		{
			// H.264 Main Profile (更好压缩)
			codec: 'avc1.4D001E',
			width: actualWidth,
			height: actualHeight,
			bitrate: 1_800_000,
			framerate: 30
			// description: 'H.264 Main Profile'
		},
		{
			// H.264 High Profile (最佳质量)
			codec: 'avc1.64001E',
			width: actualWidth,
			height: actualHeight,
			bitrate: 2_500_000,
			framerate: 30
			// description: 'H.264 High Profile'
		},
		{
			// VP8 - WebM 容器常用，广泛支持
			codec: 'vp8',
			width: actualWidth,
			height: actualHeight,
			bitrate: 1_200_000,
			framerate: 30
			// description: 'VP8 (WebM兼容)'
		},
		{
			// VP9 - 现代 WebM 编码
			codec: 'vp09.00.10.08',
			width: actualWidth,
			height: actualHeight,
			bitrate: 1_000_000,
			framerate: 30
			// description: 'VP9 (现代WebM)'
		},
		{
			// 低分辨率备用方案
			codec: 'avc1.42E01E',
			width: Math.min(actualWidth, 1280),
			height: Math.min(actualHeight, 720),
			bitrate: 1_000_000,
			framerate: 30
			// description: 'H.264 720p备用'
		},
		{
			codec: 'vp8',
			width: Math.min(actualWidth, 854),
			height: Math.min(actualHeight, 480),
			bitrate: 600_000,
			framerate: 30
			// description: 'VP8 480p备用'
		}
	]

	let codecConfig: VideoEncoderConfig | null = null

	for (const value of configures) {
		try {
			const encoderSupport = await VideoEncoder.isConfigSupported(value)

			if (encoderSupport.supported) {
				// 保存当前使用的编码器配置
				codecConfig = value
				console.log('选择的编码器配置:', value)
				message.success(`编码器选择成功: ${value.codec}`)
				break
			} else {
				console.log(`编码器不支持: ${value.codec}`)
			}
		} catch (err) {
			console.warn(`编码器 ${value.codec} 检查失败:`, err)
		}
	}

	if (!codecConfig) {
		throw new Error(
			'没有找到支持的视频编码器配置，请尝试使用支持 WebCodecs API 的现代浏览器（如 Chrome 94+）'
		)
	}

	configure.value = codecConfig

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

	isRecording.value = true

	// 处理视频轨道
	await processTrack(videoTrack)
}

function terminate() {
	isProcessing.value = false
	isRecording.value = false

	message.info('正在停止处理...')
	cleanup()
	message.success('处理已停止')
}

// 处理视频轨道
async function processTrack(videoTrack: MediaStreamTrack) {
	try {
		if (!videoEncoder) throw new Error('视频编码器未初始化')

		videoProcessor = new MediaStreamTrackProcessor(videoTrack)
		const reader: ReadableStreamDefaultReader<VideoFrame> = videoProcessor.readable.getReader()

		message.info('开始处理视频帧...')
		frameCounter = 0

		while (isProcessing.value) {
			const result = await reader.read()

			if (result.done) break

			const frame = result.value

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
	collectEncoded(chunk, buffer)
}

function collectEncoded(chunk: EncodedVideoChunk, buffer: ArrayBuffer) {
	// 在实际应用中，你可以：
	// 1. 使用 MP4Box.js 将 H.264 数据打包为 MP4
	// 2. 使用 WebM Writer 将 VP8/VP9 数据打包为 WebM
	// 3. 发送到服务器进行容器封装

	encodedChunks.push({ chunk, buffer })

	// 限制内存使用，只保留最近的100个块
	if (encodedChunks.length > 100) encodedChunks.shift()

	console.log(
		`已收集 ${encodedChunks.length} 个编码块，可用于生成 ${configure.value?.codec.startsWith('avc') ? 'MP4' : 'WebM'} 文件`
	)
}

watch(
	function () {
		return encodedChunks
	},
	function () {
		// 当收集到足够的编码数据后，尝试打包为文件并下载
		packageEncodedData()
	}
)

// 更新 Canvas 显示
function updateCanvasDisplay(frame: VideoFrame) {
	if (!canvasRef.value) return

	const ctx = canvasRef.value.getContext('2d')
	if (!ctx) return

	canvasRef.value.width = frame.displayWidth
	canvasRef.value.height = frame.displayHeight
	ctx.drawImage(frame, 0, 0)
}

function cleanup() {
	stream?.getTracks().forEach((track) => track.stop())
	stream = null

	videoEncoder?.close()
	videoProcessor = null

	audioProcessor = null

	frameCounter = 0

	configure.value = null
}

// 将收集的编码数据打包为可下载文件
function packageEncodedData() {
	if (!configure.value) return
	if (encodedChunks.length === 0) return

	const isAvc = configure.value.codec.startsWith('avc')
	const isVp = configure.value.codec.startsWith('vp')

	try {
		if (isVp) {
			// 直接将编码块拼接为 WebM（适用于 vp8/vp9 的简化演示）
			const concatenated = encodedChunks.map((c) => new Uint8Array(c.buffer))
			const blob = new Blob(concatenated, { type: 'video/webm;codecs=vp8,vp9' })
			triggerDownload(blob, `recording-${Date.now()}.webm`)
			message.success('已生成 WebM 文件并开始下载')
			return
		}

		if (isAvc) {
			// MP4 封装较复杂，建议服务端封装或使用 mp4box.js 完整流程
			// 这里先提供临时的 Annex B H.264 码流导出，部分播放器不可直接播放
			const raw = encodedChunks.map((c) => new Uint8Array(c.buffer))
			const blob = new Blob(raw, { type: 'video/h264' })
			triggerDownload(blob, `recording-${Date.now()}.h264`)
			message.info('已导出 H.264 码流（建议后续封装为 MP4）')
			return
		}

		// 其他编码类型的兜底处理
		const fallback = encodedChunks.map((c) => new Uint8Array(c.buffer))
		const blob = new Blob(fallback, { type: 'application/octet-stream' })
		triggerDownload(blob, `recording-${Date.now()}.bin`)
		message.warning('未知编码，已以二进制导出')
	} catch (err) {
		console.error('打包文件失败:', err)
		message.error('打包文件失败，请查看控制台')
	}
}

function triggerDownload(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	a.style.display = 'none'
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}

onMounted(function () {
	// void ffmpeg.load()
})
</script>

<template>
	<div class="clipchamp-overlay">
		<div class="clipchamp-section">
			<a-button @click="bootstrap" type="primary">开始录制</a-button>
			<a-button @click="terminate" type="primary" danger>停止录制</a-button>
		</div>
		<div class="clipchamp-layout">
			<video
				ref="videoRef"
				src=""
				class="flex-1 min-h-0 aspect-video bg-red-300 rounded-xl"
			></video>
			<canvas ref="canvasRef" class="flex-1 min-h-0 aspect-video bg-blue-300 rounded-xl"></canvas>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.clipchamp-overlay {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	padding: 8px;
	row-gap: 10px;

	.clipchamp-section {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		column-gap: 10px;
		flex-direction: row;
	}

	.clipchamp-layout {
		flex: 1;
		width: 100%;
		min-height: 0px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		row-gap: 10px;
	}
}
</style>
