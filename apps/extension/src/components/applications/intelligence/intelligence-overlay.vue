<script setup lang="ts">
import { GeneratorJSON, POST_COMMUNICATE, type Communicate } from '@/apis/intelligence.ts'
import CollectionEntry from '@/components/applications/intelligence/collection-entry.vue'
import ComposerBlock from '@/components/applications/intelligence/composer-block.vue'
import ConversationMarkdown from '@/components/applications/intelligence/conversation-markdown.vue'
import { useAiStore } from '@/stores/intelligence.ts'
import { throttle } from 'lodash-es'

defineOptions({
	name: 'intelligence-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()

const store = useAiStore()

const conversationRef = useTemplateRef<HTMLElement>('conversationRef')
const generating = ref(false)

const params = ref<Communicate.Params>({
	model: 'qwen3:8b',
	stream: true,
	raw: true,
	messages: []
})

const keyword = ref('')
const session = ref('')

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

async function toTokens() {
	generating.value = true
	const generators = GeneratorJSON(POST_COMMUNICATE.bind(null, params.value))
	for await (const generator of generators) {
		const { message: msg } = generator
		const { content, thinking } = msg

		if (content.startsWith('<think>')) continue
		if (content.endsWith('</think>')) continue

		if (thinking) session.value += thinking
		else session.value += content
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

const delay = throttle(function () {
	// if (!childNode) findChildNode()
	// else {
	// 	console.log('[delay] childNode', childNode)
	// 	childNode.scrollIntoView({
	// 		block: 'end',
	// 		behavior: 'smooth'
	// 	})
	// }
	if (!conversationRef.value) return
	conversationRef.value.scrollTo({
		top: conversationRef.value.scrollHeight,
		behavior: 'smooth'
	})
}, 600)

function onTriggerEnter(event: KeyboardEvent) {
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

function updateKeyword(value: string) {
	console.log('[updateKeyword]', value)

	keyword.value = value
}
</script>

<template>
	<div class="intelligence-overlay">
		<CollectionEntry></CollectionEntry>
		<div class="interactive-section">
			<div class="conversation-section">
				<div class="conversation-heading">{{ session.slice(0, 12) || '未命名标题' }}</div>
				<div ref="conversationRef" class="conversation-scroll">
					<ConversationMarkdown :session="session" :generating="generating"></ConversationMarkdown>
				</div>
			</div>
			<ComposerBlock
				:keyword="keyword"
				@trigger:enter="onTriggerEnter"
				@update:keyword="updateKeyword"
			></ComposerBlock>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.intelligence-overlay {
	$columns: 24;
	$begin: 1;
	$final: 5;
	--composer-max-width: 800px;

	width: 100%;
	height: 100%;
	display: grid;
	grid-template-columns: repeat($columns, 1fr);
	background-color: rgba($color: #f0f0f1, $alpha: 1);

	.collection-entry {
		grid-column: $begin / span $final;
	}

	.interactive-section {
		width: 100%;
		height: 100%;
		grid-column: ($final + 1) / span ($columns - $final);
		min-height: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		padding-block: 8px;
		padding-inline: calc(calc(100% - var(--composer-max-width, 800px)) / 2);

		row-gap: 10px;
	}

	.conversation-section {
		width: 100%;
		flex-grow: 1;
		flex-shrink: 1;
		flex-basis: 0%;
		min-height: 0px;
		display: flex;
		align-items: center;
		flex-direction: column;
		justify-content: space-between;
		row-gap: 10px;
	}

	.conversation-heading {
		width: 100%;
		height: 32px;
		line-height: 32px;
		text-align: center;

		@apply bg-orange-300;
	}

	.conversation-scroll {
		width: 100%;
		flex-grow: 1;
		flex-shrink: 1;
		flex-basis: 0%;
		min-height: 0px;
		border-radius: 8px;
		overflow: hidden scroll;
	}

	.conversation-markdown {
		// flex-grow: 1;
		// flex-shrink: 1;
		// flex-basis: 0%;
		// min-height: 0px;
		background-color: #ffffff;
	}
}
</style>
