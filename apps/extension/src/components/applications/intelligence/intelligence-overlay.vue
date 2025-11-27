<script setup lang="ts">
import type { Communicate } from '@/apis/intelligence.ts'
import { GeneratorJSON, POST_COMMUNICATE } from '@/apis/intelligence.ts'
import { useAiStore } from '@/stores/intelligence.ts'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import { throttle } from 'lodash-es'
import { Marked } from 'marked'

defineOptions({
	name: 'intelligence-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()

const store = useAiStore()
const visualRef = useTemplateRef('visualRef')

const marked = new Marked()
marked.setOptions({
	gfm: true,
	breaks: true
})
marked.use({
	renderer: {
		code({ text, lang }) {
			const safelang = lang && hljs.getLanguage(lang) ? lang : null
			const highlighted = safelang
				? hljs.highlight(text, { language: safelang }).value
				: hljs.highlightAuto(text).value
			const classNames = safelang ? `hljs language-${safelang}` : 'hljs'
			return `<pre><code class="${classNames}">${highlighted}</code></pre>`
		}
	}
})
const session = ref('')
const keyword = ref('')

const DOMSanitized = computed(function () {
	const DOMString = marked.parse(session.value, { async: false })
	return DOMPurify.sanitize(DOMString)
})

const generating = ref(false)

const params = ref<Communicate.Params>({
	model: 'qwen3:8b',
	stream: true,
	raw: true,
	messages: []
})

function toInsertSession() {
	void store.toInsertSession().then(function (response) {
		console.log('[toInsertSession]', response)
	})
}

function toggleSession(e: MouseEvent) {
	const target = e.target as HTMLElement
	const id = target.dataset.id
	if (!id) return
	const session = store.sessions?.find(function (session) {
		return session.id === id
	})
	if (!session) return
	store.session = session
}

// let childNode: HTMLElement | null = null

// function findChildNode() {
// 	if (!visualRef.value) return

// 	const childNodes = visualRef.value.childNodes
// 	Array.from(childNodes).forEach(function (node) {
// 		if (node.nodeType !== Node.ELEMENT_NODE) return
// 		const element = node as HTMLElement
// 		if (!element.classList.contains('generator')) return
// 		childNode = element
// 	})
// }

const delay = throttle(function () {
	// if (!childNode) findChildNode()
	// else {
	// 	console.log('[delay] childNode', childNode)

	// 	childNode.scrollIntoView({
	// 		block: 'end',
	// 		behavior: 'smooth'
	// 	})
	// }
	if (!visualRef.value) return
	visualRef.value.scrollTo({
		top: visualRef.value.scrollHeight,
		behavior: 'smooth'
	})
}, 600)

async function toTokens() {
	generating.value = true
	const generators = GeneratorJSON<Communicate.Response>(POST_COMMUNICATE.bind(null, params.value))
	for await (const generator of generators) {
		const { message: msg } = generator
		const { content } = msg

		if (content.startsWith('<think>')) continue
		if (content.endsWith('</think>')) continue

		session.value += content
		delay()
	}

	void store
		.toInsertMessage({
			role: 'assistant',
			content: session.value
		})
		.then(function (response) {
			console.log('[toInsertMessage]', response)
		})
		.finally(function () {
			generating.value = false
		})
}

function onEnter(event: KeyboardEvent) {
	event.preventDefault()
	if (event.shiftKey) return (keyword.value += '\n')
	console.log('[onEnter]', keyword.value)

	if (!keyword.value.trim()) return
	session.value = ''

	const message: Communicate.Message = {
		role: 'user',
		content: keyword.value
	}

	if (store.messages) {
		params.value.messages = store.messages
			.map(function (msg) {
				return {
					role: msg.role,
					content: msg.content
				}
			})
			.concat([message])
	}
	void store.toInsertMessage(message).then(function (response) {
		console.log('[toInsertMessage]', response)
	})

	keyword.value = ''

	void toTokens()
}

function onUpdateValue(value: string) {
	console.log('[onUpdateValue]', value)
	keyword.value = value
}
</script>

<template>
	<div class="intelligence-overlay">
		<div class="aside-area">
			<a-button @click="toInsertSession" block>新增对话</a-button>
			<div class="histories-area">
				<div @click="toggleSession" class="histories">
					<div
						:data-id="session.id"
						v-for="session in store.sessions"
						:key="session.id"
						:class="[
							'history',
							{
								'is-active': store.session?.id === session.id
							}
						]"
					>
						{{ session.title }}-{{ session.id }}
					</div>
				</div>
			</div>
		</div>

		<div class="thinking-area">
			<div class="visual-area">
				<div ref="visualRef" class="visual">
					<template v-for="message in store.messages" :key="message.id">
						<div :class="['session-area', message.role]">
							{{
								message.content.startsWith('\n')
									? message.content.replace(/^\n/, '')
									: message.content
							}}
						</div>
					</template>
					<div v-if="generating" class="session-area assistant generator">{{ session }}</div>
				</div>
			</div>
			<div class="interactive-area">
				<a-textarea
					:value="keyword"
					:bordered="false"
					class="interactive"
					@pressEnter.self="onEnter"
					@update:value="onUpdateValue"
					placeholder="请输入内容，Shift + Enter 换行，Enter 发送"
				></a-textarea>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.intelligence-overlay {
	$columns: 24;
	$begin: 1;
	$final: 5;

	width: 100%;
	height: 100%;
	display: grid;
	grid-template-columns: repeat($columns, 1fr);
	background-color: rgba($color: #f0f0f1, $alpha: 1);

	.aside-area {
		width: 100%;
		height: 100%;
		min-height: 0;
		padding-inline-start: 6px;
		display: flex;
		flex-direction: column;
		grid-column: $begin / span $final;
		// background-color: rgba($color: #f5b9b9, $alpha: 1);
	}

	.ant-btn {
		border: 0;
		width: calc(100% - 6px);
	}

	.histories-area {
		flex: 1;
		width: 100%;
		height: 100%;
		overflow: hidden scroll;
		scroll-snap-type: proximity;
		scroll-behavior: smooth;
	}

	.histories {
		display: flex;
		min-height: 0;
		flex-direction: column;
	}

	.history {
		width: 100%;
		padding: 8px 12px;
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
		word-break: keep-all;
		cursor: pointer;
		border-radius: 8px;

		&:hover,
		&.is-active {
			background-color: rgba($color: #4080ff, $alpha: 0.3);
		}
	}

	.thinking-area {
		grid-column: ($final + 1) / span ($columns - $final);
		width: 100%;
		height: 100%;
		min-height: 0;
		display: grid;
		grid-template-rows: repeat(24, 1fr);
	}

	.visual-area {
		width: 100%;
		height: 100%;
		padding: 16px;
		grid-row: 1 / span 18;
		min-height: 0;
	}

	.visual {
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow: hidden scroll;
		scroll-behavior: smooth;

		& > :not([hidden]) ~ :not([hidden]) {
			margin-top: 20px;
		}

		*,
		*::before,
		*::after {
			user-select: text;
		}
	}

	.session-area {
		width: 100%;
		white-space: pre-wrap;
		font-size: 14px;
		word-wrap: break-word;
		word-break: break-all;
		border-radius: 8px;
		padding: 8px 16px;

		&:empty {
			padding: 0;
		}

		&.assistant {
			color: #000000;
			background-color: #ffffff;
		}

		&.user {
			width: fit-content;
			margin-inline-start: auto;
			color: #ffffff;
			background-color: #0199fe;
		}
	}

	.interactive-area {
		width: 100%;
		height: 100%;
		grid-row: 19 / span 6;
		border-radius: 8px;
		padding: 8px 16px;
		background-color: #ffffff;
		box-shadow:
			0 4px 10px rgba(0, 0, 0, 0.02),
			0 2px 4px rgba(0, 0, 0, 0.04);
	}

	.interactive {
		width: 100%;
		height: 100%;
		overflow: hidden scroll;
		scroll-behavior: smooth;
		resize: none;
	}
}
</style>
