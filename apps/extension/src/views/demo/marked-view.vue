<script setup lang="ts">
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import CSS from 'highlight.js/lib/languages/css'
import JavaScript from 'highlight.js/lib/languages/javascript'
import TypeScript from 'highlight.js/lib/languages/typescript'
import XML from 'highlight.js/lib/languages/xml'
import 'highlight.js/styles/github-dark-dimmed.css'
import { marked, Marked, type MarkedExtension, type TokensList } from 'marked'
import { DOMstringify } from './DOMstringify'
import MarkdownRender from './components/markdown-render.vue'

defineOptions({
	name: 'marked-view'
})

hljs.registerLanguage('javascript', JavaScript)
hljs.registerLanguage('typescript', TypeScript)
hljs.registerLanguage('css', CSS)
hljs.registerLanguage('html', XML)

// marked 扩展示例：添加自定义标记 代码块

marked.use({
	renderer: {
		code({ text, type, lang, escaped }) {
			const safelang = lang && hljs.getLanguage(lang) ? lang : null
			const highlighted = safelang
				? hljs.highlight(text, { language: safelang }).value
				: hljs.highlightAuto(text).value
			const classNames = safelang ? `hljs language-${safelang}` : 'hljs'
			return `<pre><code class="${classNames}">${highlighted}</code></pre>`
		}
	}
})
const tokens = marked.lexer(DOMstringify)
onMounted(function () {
	// console.log('parse', marked.parse(DOMstringify, { async: false }))
	// console.log('parser', marked.parser(tokens))
	// DOMPurify.sanitize(marked.parse(DOMstringify, { async: false }))
	// console.log('lexer', tokens)
})
</script>

<template>
	<div class="marked-view">
		<MarkdownRender :tokens="tokens" />
	</div>
</template>

<style lang="scss" scoped>
.marked-view {
	width: 100%;
	height: 100%;
}
</style>

<style lang="scss">
@use '@/views/demo/normalize.scss' as *;

.marked-view {
	@extend %normalize;
}
</style>
