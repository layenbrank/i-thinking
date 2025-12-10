<script setup lang="ts">
import { GeneratorJSON, POST_COMMUNICATE } from '@/apis/intelligence.ts'

type CommunicateParams = Application.Intelligence.Communicate.Params
type CommunicateResponse = Application.Intelligence.Communicate.Response

defineOptions({
	name: 'IntelligenceView'
})

const message = ref('assistant:')
const params = ref<CommunicateParams>({
	model: 'deepseek-r1:8b',
	stream: true,
	raw: true,
	messages: [
		{
			role: 'user',
			content: '你好'
			// content: '[INST] 你好 [/INST]'
		}
	]
})

onMounted(async function () {
	const values: CommunicateResponse[] = []

	const asyncIterator = GeneratorJSON(POST_COMMUNICATE.bind(null, params.value))

	for await (const generator of asyncIterator) {
		// console.log(
		// 	'[Date]',
		// 	new Date(generator.created_at)
		// 		.toLocaleString('zh-CN', {
		// 			hour12: false,
		// 			year: 'numeric',
		// 			month: '2-digit',
		// 			day: '2-digit',
		// 			hour: '2-digit',
		// 			minute: '2-digit',
		// 			second: '2-digit'
		// 			// fractionalSecondDigits: 3
		// 		})
		// 		.replaceAll('/', '-'),
		// 	'\n[generator]',
		// 	generator
		// )

		// <think></think> 标签不显示
		if (generator.message.content.startsWith('<think>')) continue
		if (generator.message.content.endsWith('</think>')) continue

		values.push(generator)

		message.value += generator.message.content
	}
})
</script>

<template>
	<div class="intelligence-view">
		<span class="msg-box">
			{{ message }}
		</span>
	</div>
</template>

<style lang="scss" scoped>
.intelligence-view {
	width: 100%;
	height: 100%;

	.msg-box {
		display: block;
		white-space: pre-wrap;
		padding: 16px;
		font-size: 14px;
		word-wrap: break-word;
		color: #333;
		background-color: #f9f9f9;
	}
}
</style>
