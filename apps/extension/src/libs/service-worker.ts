// service-worker 拦截请求，返回对应的镜像资源

// 域名映射配置：原始域名 -> 镜像域名
const DOMAIN_MIRROR_MAP: Record<string, string> = {
	'example.com': 'mirror.example.com'
	// 可以在这里添加更多域名映射
	// 'another-domain.com': 'mirror.another-domain.com',
}

// 需要拦截的请求类型
const INTERCEPTED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

// 检查是否需要拦截该请求
function isIntercept(url: URL): boolean {
	return DOMAIN_MIRROR_MAP.hasOwnProperty(url.hostname)
}

// 获取镜像域名
function findMirrorDomain(hostname: string): string | null {
	return DOMAIN_MIRROR_MAP[hostname] ?? null
}

// 构造镜像 URL
function buildMirrorURL(originalUrl: URL, mirrorDomain: string): string {
	const protocol = originalUrl.protocol
	const pathname = originalUrl.pathname
	const search = originalUrl.search
	const hash = originalUrl.hash

	return `${protocol}//${mirrorDomain}${pathname}${search}${hash}`
}

// 克隆请求体（用于非 GET 请求）
async function cloneRequestBody(request: Request): Promise<BodyInit | null> {
	if (request.method === 'GET') return null
	if (request.method === 'HEAD') return null

	try {
		return await request.clone().arrayBuffer()
	} catch (error) {
		console.error('克隆请求体失败:', error)
		return null
	}
}

// 处理 fetch 事件
self.addEventListener('fetch', function (event: any) {
	const { request } = event
	const url = new URL(request.url)

	// 跳过非 HTTP/HTTPS 请求
	if (!['http:', 'https:'].includes(url.protocol)) return

	// 检查是否需要拦截
	if (!isIntercept(url)) return

	// 检查请求方法是否在拦截列表中
	if (!INTERCEPTED_METHODS.includes(request.method)) return

	// 获取镜像域名
	const mirrorDomain = findMirrorDomain(url.hostname)
	if (!mirrorDomain) return

	// 阻止默认行为，使用自定义处理
	event.respondWith(
		(async function () {
			try {
				// 构造镜像 URL
				const mirrorUrl = buildMirrorURL(url, mirrorDomain)

				// 克隆请求体（如果需要）
				const body = await cloneRequestBody(request)

				// 创建新的请求配置
				const requestInit: RequestInit = {
					method: request.method,
					headers: new Headers(request.headers),
					mode: request.mode,
					credentials: request.credentials,
					cache: request.cache,
					redirect: request.redirect,
					referrer: request.referrer,
					referrerPolicy: request.referrerPolicy,
					integrity: request.integrity
				}

				// 添加请求体（如果有）
				if (body) {
					requestInit.body = body
				}

				// 创建新的请求
				const newRequest = new Request(mirrorUrl, requestInit)

				// 发送请求到镜像服务器
				const response = await fetch(newRequest)

				// 克隆响应以便多次使用
				const clonedResponse = response.clone()

				// 返回响应
				return clonedResponse
			} catch (error) {
				// 错误处理：如果镜像请求失败，可以回退到原始请求或返回错误响应
				console.error('镜像请求失败:', error)

				// 选项1：回退到原始请求
				try {
					return await fetch(request)
				} catch (fallbackError) {
					console.error('原始请求也失败:', fallbackError)

					// 选项2：返回错误响应
					return new Response(
						JSON.stringify({
							error: '请求失败',
							message: error instanceof Error ? error.message : '未知错误',
							originalUrl: url.href,
							mirrorUrl: buildMirrorURL(url, mirrorDomain)
						}),
						{
							status: 500,
							statusText: 'Internal Server Error',
							headers: {
								'Content-Type': 'application/json'
							}
						}
					)
				}
			}
		})()
	)
})
