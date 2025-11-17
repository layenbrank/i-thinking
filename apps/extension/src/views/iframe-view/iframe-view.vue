<script setup lang="ts">
import type { Communicate } from '@/apis/intelligence'
import { GeneratorJSON, POST_COMMUNICATE } from '@/apis/intelligence'
import { useCrossContextBridge } from '@/composables/useCrossContextBridge'
import { useMarkdownPlugin } from '@/composables/useMarkdownPlugin'
import { useMarkdownRenderer } from '@/composables/useMarkdownRenderer'
import { usePerformanceMonitor } from '@/composables/usePerformanceMonitor'
import { createHighlightPlugin } from '@/plugins/highlight.plugin'

defineOptions({
	name: 'iframe-view'
})

/**
 * iframe 引用
 */
const iframeRef = useTemplateRef<HTMLIFrameElement>('iframeRef')

/**
 * 状态管理
 */
const isLoading = ref(false)
const error = ref<string | null>(null)
const markdownContent = ref('')
const renderedHtml = ref('')

/**
 * 插件管理器
 */
const pluginManager = useMarkdownPlugin()

void pluginManager.register(createHighlightPlugin())

/**
 * Markdown 渲染器
 */
const renderer = useMarkdownRenderer({
	gfm: true,
	breaks: true,
	sanitize: true,
	pluginManager,
	features: ['highlight'],
	cache: {
		enabled: true,
		maxSize: 100,
		ttl: 60000
	}
})

/**
 * 性能监控器
 */
const perfMonitor = usePerformanceMonitor({
	sampleInterval: 1000,
	maxSamples: 60,
	enableMemory: true,
	enableFPS: true
})

/**
 * iframe 通信桥接
 */
let bridge: ReturnType<typeof useCrossContextBridge> | null = null

/**
 * 初始化 iframe 通信
 */
function initIframeBridge() {
	const iframe = iframeRef.value
	if (!iframe?.contentWindow) return

	bridge = useCrossContextBridge({
		target: iframe.contentWindow,
		origin: window.location.origin,
		heartbeatInterval: 5000,
		timeout: 30000
	})

	// 监听 iframe 消息
	bridge.onMessage((message) => {
		console.log('Received message from iframe:', message)
	})

	// 监听连接状态
	watch(
		() => bridge?.isConnected.value,
		(isConnected) => {
			console.log('Iframe connection status:', isConnected)
		}
	)
}

/**
 * 渲染 Markdown 到 iframe
 */
async function renderMarkdown(markdown: string) {
	try {
		isLoading.value = true
		error.value = null

		// 性能标记
		perfMonitor.mark('render-start')

		// 渲染 Markdown
		const result = await renderer.render(markdown)
		renderedHtml.value = result.html

		// 性能测量
		perfMonitor.mark('render-end')
		perfMonitor.measure('markdown-render', 'render-start', 'render-end')

		// 更新缓存命中率
		const cacheStats = renderer.getCacheStats()
		perfMonitor.updateCacheHitRate(cacheStats.hits, cacheStats.hits + cacheStats.misses)

		// 清除标记
		perfMonitor.clearMarks('render-start')
		perfMonitor.clearMarks('render-end')

		// 发送到 iframe
		const iframe = iframeRef.value
		if (iframe) {
			const htmlDoc = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Markdown Preview</title>
	<base target="_blank">
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			line-height: 1.6;
			color: #333;
			padding: 20px;
			background: #fff;
		}
		h1, h2, h3, h4, h5, h6 {
			margin-top: 24px;
			margin-bottom: 16px;
			font-weight: 600;
			line-height: 1.25;
		}
		h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
		h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
		h3 { font-size: 1.25em; }
		p { margin-bottom: 16px; }
		code {
			background: #f6f8fa;
			padding: 0.2em 0.4em;
			border-radius: 3px;
			font-family: 'Consolas', 'Monaco', monospace;
			font-size: 85%;
		}
		pre {
			background: #f6f8fa;
			padding: 16px;
			border-radius: 6px;
			overflow-x: auto;
			margin-bottom: 16px;
		}
		pre code {
			background: none;
			padding: 0;
		}
		a {
			color: #0366d6;
			text-decoration: none;
		}
		a:hover {
			text-decoration: underline;
		}
		blockquote {
			border-left: 4px solid #dfe2e5;
			padding-left: 16px;
			color: #6a737d;
			margin-bottom: 16px;
		}
		ul, ol {
			margin-bottom: 16px;
			padding-left: 2em;
		}
		table {
			border-collapse: collapse;
			width: 100%;
			margin-bottom: 16px;
		}
		table th, table td {
			border: 1px solid #dfe2e5;
			padding: 6px 13px;
		}
		table th {
			background: #f6f8fa;
			font-weight: 600;
		}
		img {
			max-width: 100%;
			height: auto;
		}
		::-webkit-scrollbar {
			width: 8px;
			height: 8px;
		}
		::-webkit-scrollbar-track {
			background: #f1f1f1;
		}
		::-webkit-scrollbar-thumb {
			background: #888;
			border-radius: 4px;
		}
		::-webkit-scrollbar-thumb:hover {
			background: #555;
		}
	</style>
</head>
<body>
	${result.html}
</body>
</html>
			`.trim()
			iframe.srcdoc = htmlDoc
		}

		console.log('Render complete:', {
			duration: result.duration,
			cached: result.cached,
			metadata: result.metadata
		})
	} catch (err) {
		error.value = err instanceof Error ? err.message : 'Unknown error'
		console.error('Markdown render error:', err)
	} finally {
		isLoading.value = false
	}
}

/**
 * 流式渲染 AI 响应
 */
async function streamAIResponse(params: Communicate.Params) {
	try {
		isLoading.value = true
		error.value = null
		markdownContent.value = ''

		// 创建流式请求
		const generator = GeneratorJSON<Communicate.Response>(() => POST_COMMUNICATE(params))

		// 处理流式响应
		for await (const chunk of generator) {
			if (chunk.message?.content) {
				// 过滤 <think> 标签
				const content = chunk.message.content.replace(/<think>[\s\S]*?<\/think>/g, '')
				markdownContent.value += content

				// 实时渲染
				await renderMarkdown(markdownContent.value)
			}
		}

		console.log('AI streaming complete')
	} catch (err) {
		error.value = err instanceof Error ? err.message : 'Unknown error'
		console.error('AI streaming error:', err)
	} finally {
		isLoading.value = false
	}
}

/**
 * 测试渲染
 */
function testRender() {
	const testMarkdown = `
# Markdown 渲染测试

## 代码高亮

\`\`\`javascript
function hello(name) {
	console.log(\`Hello, \${name}!\`)
}

hello('World')
\`\`\`

## 列表

- Item 1
- Item 2
  - Nested item
  - Another nested item
- Item 3

## 链接和图片

[GitHub](https://github.com)

## 表格

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

## 引用

> This is a blockquote.
> It can span multiple lines.

## 行内代码

使用 \`console.log()\` 输出日志。
	`
	void renderMarkdown(testMarkdown)
}

/**
 * 组件挂载
 */
onMounted(() => {
	// 启动性能监控
	perfMonitor.start()

	// 初始化 iframe 通信
	void nextTick(() => {
		initIframeBridge()
	})

	// 测试渲染
	testRender()

	// 暴露 API 供外部调用
	;(window as any).__iframeViewAPI = {
		render: renderMarkdown,
		streamAI: streamAIResponse,
		clearCache: () => renderer.clearCache(),
		getStats: () => renderer.getCacheStats(),
		getPerformance: () => perfMonitor.getStats()
	}
})

/**
 * 组件卸载
 */
onUnmounted(() => {
	perfMonitor.stop()
})

/**
 * 组件卸载
 */
onUnmounted(() => {
	bridge?.dispose()
	delete (window as any).__iframeViewAPI
})
</script>

<template>
	<div class="iframe-view">
		<div v-if="isLoading" class="loading">渲染中...</div>
		<div v-if="error" class="error">{{ error }}</div>
		<iframe ref="iframeRef" frameborder="0" sandbox="allow-scripts allow-popups"></iframe>

		<!-- 说明：仅开放 allow-popups 以允许新窗口打开；不启用 allow-same-origin，避免沙箱逃逸 -->
	</div>
</template>

<style lang="scss" scoped>
.iframe-view {
	position: relative;
	width: 100%;
	height: 100%;

	.loading,
	.error {
		position: absolute;
		top: 10px;
		right: 10px;
		padding: 8px 12px;
		border-radius: 4px;
		font-size: 12px;
		z-index: 10;
	}

	.loading {
		background: #e6f7ff;
		color: #1890ff;
		border: 1px solid #91d5ff;
	}

	.error {
		background: #fff2f0;
		color: #ff4d4f;
		border: 1px solid #ffccc7;
	}

	iframe {
		width: 100%;
		height: 100%;
		border: none;
	}
}
</style>
