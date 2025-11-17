<script setup lang="ts">
import { getHljs } from './highlight.demo'

const props = withDefaults(
	defineProps<{
		code: string
		lang?: string | null
	}>(),
	{
		lang: null
	}
)

const emit = defineEmits<{
	(e: 'preview', payload: { code: string; lang?: string | null }): void
	(e: 'copy', payload: { code: string; lang?: string | null; success: boolean }): void
	(e: 'toggle', payload: { expanded: boolean }): void
}>()

const expanded = ref(false)

const highlighted = computed(function () {
	const hljs = getHljs()
	try {
		if (props.lang && hljs.getLanguage(props.lang)) {
			return hljs.highlight(props.code, { language: props.lang }).value
		}
		return hljs.highlightAuto(props.code).value
	} catch {
		return props.code
	}
})

async function onCopy() {
	try {
		if (navigator?.clipboard?.writeText) {
			await navigator.clipboard.writeText(props.code)
			emit('copy', { code: props.code, lang: props.lang, success: true })
			return
		}
		// 回退方案
		const textarea = document.createElement('textarea')
		textarea.value = props.code
		textarea.style.position = 'fixed'
		textarea.style.opacity = '0'
		document.body.appendChild(textarea)
		textarea.select()
		document.execCommand('copy')
		document.body.removeChild(textarea)
		emit('copy', { code: props.code, lang: props.lang, success: true })
	} catch {
		emit('copy', { code: props.code, lang: props.lang, success: false })
	}
}

function onPreview() {
	emit('preview', { code: props.code, lang: props.lang })
}

function onToggle() {
	expanded.value = !expanded.value
	emit('toggle', { expanded: expanded.value })
}
</script>

<template>
	<div class="demo-code-block">
		<div class="demo-code-toolbar">
			<slot
				name="toolbar"
				:lang="lang"
				:code="code"
				:expanded="expanded"
				:copy="onCopy"
				:preview="onPreview"
				:toggle="onToggle"
			>
				<button class="preview-button" @click="onPreview">预览</button>
				<button class="copy-button" @click="onCopy">复制</button>
				<button class="toggle-button" @click="onToggle">{{ expanded ? '收起' : '展开' }}</button>
			</slot>
		</div>
		<div class="demo-code-wrapper" :class="{ expanded }">
			<pre>
        <code class="hljs" :class="lang ? 'language-' + lang : ''" v-html="highlighted"></code>
      </pre>
		</div>
		<slot name="footer" :lang="lang" :code="code" />
	</div>
</template>

<style scoped lang="scss">
.demo-code-block {
	width: 100%;
}

.demo-code-toolbar {
	display: flex;
	gap: 8px;
	margin-bottom: 8px;
}

.preview-button,
.copy-button,
.toggle-button {
	padding: 6px 16px;
	border: none;
	background-color: #007bff;
	color: #fff;
	border-radius: 4px;
	cursor: pointer;
}

.demo-code-wrapper.expanded pre {
	max-height: none;
}

pre {
	background: #0d1117;
	border-radius: 8px;
	overflow: auto;
	padding: 12px;
}
</style>
