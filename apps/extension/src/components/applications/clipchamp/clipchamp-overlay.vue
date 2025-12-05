<script setup lang="ts">
import { FFmpeg } from '@ffmpeg/ffmpeg'
import {
	AudioSampleEntry,
	DIFF_PRIMITIVE_ARRAY_PROP_NAMES,
	HintSampleEntry,
	MP4BoxBuffer,
	MPEG4DescriptorParser,
	MetadataSampleEntry,
	MultiBufferStream,
	SampleEntry,
	SampleGroupEntry,
	SampleGroupInfo,
	SingleItemTypeReferenceBox,
	TextSampleEntry,
	VTTin4Parser,
	VisualSampleEntry
} from 'mp4box'

defineOptions({
	name: 'clipchamp-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()

const canvasRef = useTemplateRef('canvasRef')
const ffmpeg = new FFmpeg()
const mediaStream: MediaStream | null = null
const videoEncoder: VideoEncoder | null = null

// function cleanup() {}

onMounted(function () {
	setTimeout(() => {
		// void ffmpeg.load()
		void navigator.mediaDevices
			.getDisplayMedia({
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
			.then(function (stream) {
				console.log('mediaStream', stream)
			})

		console.log('mediaDevices', navigator.mediaDevices)

		// mediaStream.getTracks().forEach((track) => {
		// 	console.log('track', track)
		// })
	}, 3000)
})
</script>

<template>
	<div class="clipchamp-overlay">
		<canvas ref="canvasRef"></canvas>
	</div>
</template>

<style lang="scss" scoped>
.clipchamp-overlay {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
