import { marked } from 'marked'
import type { MarkdownPluginManager } from './useMarkdownPlugin'

/**
 * Markdown 渲染器
 *
 * 职责
 * - 统一配置 Marked 并应用插件钩子
 * - 提供渲染缓存（命中计数/TTL/访问次数淘汰）
 * - 提取文档元数据（目录、链接、图片、代码块数）
 *
 * 性能
 * - 通过 cacheHits/cacheMisses 统计命中率，结合 Performance API 进行测量
 */

/**
 * Markdown 渲染器配置
 */
export interface RendererConfig {
	/** 启用的功能 */
	features?: string[]
	/** 主题选项 */
	theme?: {
		code?: string
		math?: string
		mermaid?: string
	}
	/** 缓存配置 */
	cache?: {
		enabled?: boolean
		maxSize?: number
		ttl?: number
	}
	/** 安全选项 */
	sanitize?: boolean
	/** 是否启用 GFM */
	gfm?: boolean
	/** 是否启用换行符 */
	breaks?: boolean
	/** 插件管理器 */
	pluginManager?: MarkdownPluginManager
}

/**
 * 渲染结果
 */
export interface RenderResult {
	html: string
	duration: number
	cached: boolean
	metadata: {
		headings?: { level: number; text: string; id: string }[]
		links?: string[]
		images?: string[]
		codeBlocks?: number
	}
}

/**
 * Markdown 渲染器
 */
export function useMarkdownRenderer(config: RendererConfig = {}) {
	const {
		features: _features = [],
		theme: _theme = {},
		cache: cacheConfig = { enabled: true, maxSize: 100, ttl: 60000 },
		sanitize = true,
		gfm = true,
		breaks = true,
		pluginManager
	} = config

	// 渲染缓存
	const renderCache = new Map<
		string,
		{ result: RenderResult; timestamp: number; accessCount: number }
	>()

	// 缓存统计
	const cacheHits = ref(0)
	const cacheMisses = ref(0)

	// 配置 marked
	const markedInstance = marked

	// 基础配置
	markedInstance.setOptions({
		gfm,
		breaks
	})

	/**
	 * 初始化渲染器
	 */
	function initialize() {
		// 自定义渲染器
		const renderer = new marked.Renderer()

		// 自定义标题渲染（添加ID）
		renderer.heading = ({ text, depth }) => {
			const id = text
				.toLowerCase()
				.replace(/[^\w\u4e00-\u9fa5]+/g, '-')
				.replace(/^-+|-+$/g, '')
			return `<h${depth} id="${id}">${text}</h${depth}>\n`
		}

		// 自定义代码块渲染
		renderer.code = ({ text, lang }) => {
			const language = lang ?? 'text'
			const className = `language-${language}`
			return `<pre><code class="${className}" data-lang="${language}">${escapeHtml(text)}</code></pre>\n`
		}

		// 自定义链接渲染（安全处理）
		renderer.link = ({ href, title, text }) => {
			if (sanitize) {
				// 过滤危险协议
				const dangerousProtocols = ['javascript:', 'data:', 'vbscript:']
				const lowerHref = href.toLowerCase()
				if (dangerousProtocols.some((proto) => lowerHref.startsWith(proto))) {
					return text
				}
			}

			const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
			const target = href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''
			return `<a href="${escapeHtml(href)}"${titleAttr}${target}>${text}</a>`
		}

		markedInstance.use({ renderer })
	}

	/**
	 * HTML 转义
	 */
	function escapeHtml(text: string): string {
		const map: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;'
		}
		return text.replace(/[&<>"']/g, (char) => map[char] ?? char)
	}

	/**
	 * 提取元数据
	 */
	function extractMetadata(html: string): RenderResult['metadata'] {
		const metadata: RenderResult['metadata'] = {
			headings: [],
			links: [],
			images: [],
			codeBlocks: 0
		}

		// 提取标题
		const headingRegex = /<h([1-6])\s+id="([^"]*)"[^>]*>(.*?)<\/h\1>/gi
		let match: RegExpExecArray | null
		while ((match = headingRegex.exec(html)) !== null) {
			if (match[1] && match[2] && match[3]) {
				metadata.headings?.push({
					level: Number.parseInt(match[1], 10),
					id: match[2],
					text: match[3].replace(/<[^>]*>/g, '')
				})
			}
		}

		// 提取链接
		const linkRegex = /<a\s+href="([^"]*)"[^>]*>/gi
		while ((match = linkRegex.exec(html)) !== null) {
			if (match[1]) {
				metadata.links?.push(match[1])
			}
		}

		// 提取图片
		const imgRegex = /<img\s+src="([^"]*)"[^>]*>/gi
		while ((match = imgRegex.exec(html)) !== null) {
			if (match[1]) {
				metadata.images?.push(match[1])
			}
		}

		// 计算代码块
		metadata.codeBlocks = (html.match(/<pre>/g) ?? []).length

		return metadata
	}

	/**
	 * 清理缓存
	 */
	function cleanCache() {
		if (!cacheConfig.enabled) return

		const now = Date.now()
		const maxSize = cacheConfig.maxSize ?? 100
		const ttl = cacheConfig.ttl ?? 60000

		// 删除过期项
		for (const [key, entry] of renderCache.entries()) {
			if (now - entry.timestamp > ttl) {
				renderCache.delete(key)
			}
		}

		// 如果仍超出大小限制，删除访问次数最少的
		if (renderCache.size > maxSize) {
			const entries = Array.from(renderCache.entries()).sort(
				(a, b) => a[1].accessCount - b[1].accessCount
			)
			const toDelete = entries.slice(0, renderCache.size - maxSize)
			for (const [key] of toDelete) {
				renderCache.delete(key)
			}
		}
	}

	/**
	 * 渲染 Markdown
	 */
	async function render(markdown: string): Promise<RenderResult> {
		const startTime = performance.now()

		// 检查缓存
		if (cacheConfig.enabled) {
			const cached = renderCache.get(markdown)
			if (cached) {
				cached.accessCount++
				cacheHits.value++
				return {
					...cached.result,
					cached: true,
					duration: performance.now() - startTime
				}
			}
			cacheMisses.value++
		}

		try {
			// 执行 beforeRender 插件钩子
			let processedMarkdown = markdown
			if (pluginManager) {
				processedMarkdown = await pluginManager.executeBeforeRender(markdown)
			}

			// 渲染
			let html = await markedInstance.parse(processedMarkdown)

			// 执行 afterRender 插件钩子
			if (pluginManager) {
				html = await pluginManager.executeAfterRender(html)
			}

			// 提取元数据
			const metadata = extractMetadata(html)

			const result: RenderResult = {
				html,
				duration: performance.now() - startTime,
				cached: false,
				metadata
			}

			// 缓存结果
			if (cacheConfig.enabled) {
				renderCache.set(markdown, {
					result,
					timestamp: Date.now(),
					accessCount: 1
				})
				cleanCache()
			}

			return result
		} catch (error) {
			console.error('Markdown render error:', error)
			throw error
		}
	}

	/**
	 * 批量渲染
	 */
	async function renderBatch(markdowns: string[]): Promise<RenderResult[]> {
		return Promise.all(markdowns.map((md) => render(md)))
	}

	/**
	 * 清空缓存
	 */
	function clearCache(): void {
		renderCache.clear()
	}

	/**
	 * 获取缓存统计
	 */
	function getCacheStats() {
		return {
			size: renderCache.size,
			maxSize: cacheConfig.maxSize ?? 100,
			hits: cacheHits.value,
			misses: cacheMisses.value,
			entries: Array.from(renderCache.entries()).map(([key, entry]) => ({
				key: key.substring(0, 50),
				timestamp: entry.timestamp,
				accessCount: entry.accessCount
			}))
		}
	}

	/**
	 * 更新配置
	 */
	function updateConfig(newConfig: Partial<RendererConfig>): void {
		Object.assign(config, newConfig)
		initialize()
	}

	// 初始化
	initialize()

	return {
		render,
		renderBatch,
		clearCache,
		getCacheStats,
		updateConfig
	}
}

export type MarkdownRenderer = ReturnType<typeof useMarkdownRenderer>
