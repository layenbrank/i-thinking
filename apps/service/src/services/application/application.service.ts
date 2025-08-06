import {} from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import axios, { type AxiosInstance } from 'axios'
import * as cheerio from 'cheerio'
import { CreateApplicationDto } from './dto/create-application.dto'
import { UpdateApplicationDto } from './dto/update-application.dto'

@Injectable()
export class ApplicationService {
	private http: AxiosInstance

	constructor() {
		this.http = axios.create({
			timeout: 10000,
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
				'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
				'Accept-Encoding': 'gzip, deflate, br'
				// Cookie: '你的Cookie信息' // 需要替换为实际的 Cookie
			}
		})
	}

	insert(createApplicationDto: CreateApplicationDto) {
		return 'This action adds a new Application'
	}

	async findAll() {
		const application = await import('../../constants/widget.constant.json')

		return application.default
	}

	findOne(id: number) {
		return `This action returns a #${id} application`
	}

	update(id: number, updateApplicationDto: UpdateApplicationDto) {
		return `This action updates a #${id} application`
	}

	remove(id: number) {
		return `This action removes a #${id} application`
	}

	async findFavicon(url: string): Promise<string> {
		try {
			// 确保 URL 格式正确
			const targetUrl = this.normalizeUrl(url)
			console.log(`正在获取网站 favicon: ${targetUrl}`)

			// 获取网页内容
			const response = await this.http.get(targetUrl)
			const $ = cheerio.load(response.data)

			// 按优先级查找 favicon
			let favicon = this.findFaviconFromHtml($, targetUrl)

			// 如果没找到，尝试默认路径
			if (!favicon) {
				favicon = await this.tryDefaultFavicon(targetUrl)
			}

			console.log(`找到 favicon: ${favicon || '未找到'}`)
			return favicon || ''
		} catch (error) {
			console.error(`获取 favicon 失败: ${error.message}`, error.stack)

			// 尝试默认路径作为后备
			try {
				return await this.tryDefaultFavicon(url)
			} catch (fallbackError) {
				console.error(`后备方案也失败: ${fallbackError.message}`)
				return ''
			}
		}
	}

	/**
	 * 从 HTML 中查找 favicon
	 */
	private findFaviconFromHtml($: cheerio.CheerioAPI, baseUrl: string): string {
		// favicon 查找优先级列表
		const faviconSelectors = [
			'link[rel="icon"]',
			'link[rel="shortcut icon"]',
			'link[rel="apple-touch-icon"]',
			'link[rel="apple-touch-icon-precomposed"]',
			'link[rel="mask-icon"]',
			'meta[property="og:image"]',
			'meta[name="msapplication-TileImage"]'
		]

		for (const selector of faviconSelectors) {
			const elements = $(selector)

			if (elements.length > 0) {
				// 优先选择最大尺寸的图标
				let bestIcon = ''
				let maxSize = 0

				elements.each((i, elem) => {
					const href = $(elem).attr('href') || $(elem).attr('content')
					if (!href) return

					// 获取图标尺寸
					const sizes = $(elem).attr('sizes')
					let size = 0

					if (sizes && sizes !== 'any') {
						const sizeMatch = sizes.match(/(\d+)x(\d+)/)
						if (sizeMatch) {
							size = parseInt(sizeMatch[1])
						}
					}

					// 选择最大尺寸的图标，或者第一个找到的
					if (size > maxSize || (!bestIcon && href)) {
						bestIcon = href
						maxSize = size
					}
				})

				if (bestIcon) {
					return this.resolveUrl(bestIcon, baseUrl)
				}
			}
		}

		return ''
	}

	/**
	 * 尝试默认的 favicon 路径
	 */
	private async tryDefaultFavicon(url: string): Promise<string> {
		const baseUrl = this.getBaseUrl(url)
		const defaultPaths = [
			'/favicon.ico',
			'/favicon.png',
			'/favicon.svg',
			'/apple-touch-icon.png',
			'/apple-touch-icon-precomposed.png'
		]

		for (const path of defaultPaths) {
			try {
				const faviconUrl = `${baseUrl}${path}`
				const response = await this.http.head(faviconUrl)

				if (response.status === 200) {
					console.log(`在默认路径找到 favicon: ${faviconUrl}`)
					return faviconUrl
				}
			} catch (error) {
				// 继续尝试下一个路径
				continue
			}
		}

		return ''
	}

	/**
	 * 规范化 URL
	 */
	private normalizeUrl(url: string): string {
		if (!url.startsWith('http://') && !url.startsWith('https://')) {
			return `https://${url}`
		}
		return url
	}

	/**
	 * 获取基础 URL
	 */
	private getBaseUrl(url: string): string {
		try {
			const urlObj = new URL(this.normalizeUrl(url))
			return `${urlObj.protocol}//${urlObj.host}`
		} catch (error) {
			return url
		}
	}

	/**
	 * 解析相对 URL 为绝对 URL
	 */
	private resolveUrl(iconUrl: string, baseUrl: string): string {
		try {
			// 如果已经是完整 URL，直接返回
			if (iconUrl.startsWith('http://') || iconUrl.startsWith('https://')) {
				return iconUrl
			}

			// 如果是协议相对 URL（//example.com/icon.png）
			if (iconUrl.startsWith('//')) {
				const protocol = new URL(baseUrl).protocol
				return `${protocol}${iconUrl}`
			}

			// 如果是绝对路径（/icon.png）
			if (iconUrl.startsWith('/')) {
				const base = this.getBaseUrl(baseUrl)
				return `${base}${iconUrl}`
			}

			// 如果是相对路径（icon.png）
			const base = this.getBaseUrl(baseUrl)
			return `${base}/${iconUrl}`
		} catch (error) {
			console.error(`解析图标 URL 失败: ${iconUrl}`)
			return iconUrl
		}
	}
}
