<script setup lang="ts">
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import CSS from 'highlight.js/lib/languages/css'
import JavaScript from 'highlight.js/lib/languages/javascript'
import XML from 'highlight.js/lib/languages/xml'
// import { markedHighlight } from 'marked-highlight'
import { Marked } from 'marked'

import 'highlight.js/styles/atom-one-light.css' // *
// import 'highlight.js/styles/cybertopia-cherry.css'
// import 'highlight.js/styles/atom-one-dark-reasonable.css'
// import 'highlight.js/styles/github.css'
// import 'highlight.js/styles/github-dark.css'
// import 'highlight.js/styles/xcode.css'
// import 'highlight.js/styles/vs2015.css'
// import 'highlight.js/styles/vs.css'

type AiMessage = Application.Intelligence.AiMessage
type CommunicateMessage = Application.Intelligence.Communicate.Message

defineOptions({
	name: 'conversation-markdown'
})

withDefaults(
	defineProps<{
		generating: boolean
		messages: AiMessage[]
	}>(),
	{
		generating: false,
		messages: () => []
	}
)

hljs.registerLanguage('css', CSS)
hljs.registerLanguage('html', XML)
hljs.registerLanguage('javascript', JavaScript)

const marked = new Marked()

marked.setOptions({
	gfm: true,
	breaks: true,
	async: false
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

function DOMSanitized(stringified: string) {
	const DOMString = marked.parse(stringified.replace(/^\n/, ''), { async: false })
	return DOMPurify.sanitize(DOMString)
}
</script>

<template>
	<div class="conversation-markdown">
		<template v-for="message in messages" :key="message.id">
			<div
				v-html="DOMSanitized(message.fragment)"
				v-if="message.identity === 'assistant'"
				:class="['session-section', message.identity]"
			></div>
			<div
				v-text="message.fragment"
				v-if="message.identity === 'user'"
				:class="['session-section', message.identity]"
			></div>
		</template>
	</div>
</template>

<style lang="scss" scoped>
.conversation-markdown {
	width: 100%;
	display: flex;
	flex-direction: column;
	row-gap: 16px;

	*,
	*::before,
	*::after {
		user-select: text;
	}

	.session-section {
		width: 100%;
		box-sizing: border-box;
		white-space: pre-line;
		word-break: break-word;
		padding: 12px 16px;

		&.user {
			margin-inline: 16px;
			border-radius: 8px;
			width: fit-content;
			align-self: flex-end;
			background-color: #f5f5f5;
		}

		&.assistant {
			align-self: flex-start;
			background-color: #ffffff;

			> * {
				font-family:
					Inter,
					ui-sans-serif,
					system-ui,
					-apple-system,
					BlinkMacSystemFont,
					'Segoe UI',
					Roboto,
					'Helvetica Neue',
					Arial,
					'Noto Sans',
					sans-serif,
					'Apple Color Emoji',
					'Segoe UI Emoji',
					'Segoe UI Symbol',
					'Noto Color Emoji';
				line-height: revert;
				font-size: revert;
				display: revert;
				font-weight: revert;
				color: revert;
				list-style: revert;
				list-style-type: revert;
				padding: revert;
				margin: revert;
				background-color: revert;
				border: revert;
				text-decoration: revert;
				border-collapse: revert;
				text-indent: revert;
			}
		}
	}
}
</style>
