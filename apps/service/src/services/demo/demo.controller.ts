import {
	Body,
	Controller,
	Delete,
	Get,
	HttpException,
	Param,
	Patch,
	Post,
	Query
} from '@nestjs/common'
import axios, { type AxiosInstance } from 'axios'
import * as cheerio from 'cheerio'
import { createWriteStream } from 'node:fs'
import { resolve } from 'node:path'

import { DemoService } from './demo.service'
import { CreateDemoDto } from './dto/create-demo.dto'
import { UpdateDemoDto } from './dto/update-demo.dto'

// 小红书 https://www.xiaohongshu.com/explore
@Controller('demo')
export class DemoController {
	private axiosInstance: AxiosInstance
	private proxyList: string[] = [
		'http://proxy1.example.com:8080',
		'http://proxy2.example.com:8080'
		// 添加更多代理
	]

	private currentProxyIndex = 0

	constructor(private readonly testService: DemoService) {
		this.initAxiosInstance()
	}

	private initAxiosInstance() {
		this.axiosInstance = axios.create({
			timeout: 5000,
			headers: {
				'User-Agent':
					'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.20(0x18001442) NetType/WIFI Language/zh_CN',
				Accept: 'application/json, text/plain, */*',
				'Accept-Language': 'zh-CN,zh;q=0.9',
				Origin: 'https://www.xiaohongshu.com',
				Referer: 'https://www.xiaohongshu.com/',
				Cookie: '你的Cookie信息' // 需要替换为实际的 Cookie
			}
		})

		// 添加响应拦截器处理代理失败
		this.axiosInstance.interceptors.response.use(
			(response) => response,
			(error) => {
				if (error.response?.status === 403 || error.response?.status === 429) {
					return this.rotateProxy().then(() => {
						return this.axiosInstance(error.config)
					})
				}
				return Promise.reject(error)
			}
		)
	}

	private rotateProxy() {
		this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyList.length
		const proxy = this.proxyList[this.currentProxyIndex]
		if (!proxy) return Promise.resolve()
		this.axiosInstance.defaults.proxy = {
			host: new URL(proxy).hostname,
			port: Number(new URL(proxy).port),
			protocol: new URL(proxy).protocol.slice(0, -1)
		}
		return Promise.resolve()
	}

	@Get('notes/:noteId')
	async getNote(@Param('noteId') noteId: string) {
		try {
			// 小红书笔记详情 API
			const response = await this.axiosInstance.get(
				`https://www.xiaohongshu.com/api/sns/web/v1/feed/${noteId}`
			)

			return {
				success: true,
				data: response.data,
				message: '获取笔记成功'
			}
		} catch (error: any) {
			throw new HttpException(
				{
					success: false,
					message: '获取笔记失败',
					error: error?.message
				},
				error.response?.status || 500
			)
		}
	}

	@Get('explore')
	async getExploreFeeds() {
		try {
			// 获取首页推荐内容的 API
			const response = await this.axiosInstance.get(
				'https://www.xiaohongshu.com/api/sns/web/v1/feed/explore',
				{
					params: {
						page: 1,
						pageSize: 20
					}
				}
			)

			return {
				success: true,
				data: response.data,
				message: '获取推荐内容成功'
			}
		} catch (error: any) {
			throw new HttpException(
				{
					success: false,
					message: '获取推荐内容失败',
					error: error?.message
				},
				error.response?.status || 500
			)
		}
	}

	@Get('search')
	async searchNotes(@Query('keyword') keyword: string) {
		try {
			// 搜索 API
			const response = await this.axiosInstance.get(
				'https://www.xiaohongshu.com/api/sns/web/v1/search/notes',
				{
					params: {
						keyword,
						page: 1,
						pageSize: 20,
						sortBy: 'general'
					}
				}
			)

			return {
				success: true,
				data: response.data,
				message: '搜索成功'
			}
		} catch (error: any) {
			throw new HttpException(
				{
					success: false,
					message: '搜索失败',
					error: error.message
				},
				error.response?.status || 500
			)
		}
	}

	@Post()
	create(@Body() createTestDto: CreateDemoDto) {
		return this.testService.create(createTestDto)
	}

	@Get('crawl')
	async crawlXiaohongshu() {
		try {
			const headers = {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
				'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
			}

			const response = await axios.get('https://www.xiaohongshu.com/explore', {
				headers
			})

			const $ = cheerio.load(response.data)

			// 由于小红书是 SPA 应用，这里可能获取不到多少有用信息
			const pageData = {
				title: $('title').text(),
				metaDescription: $('meta[name="description"]').attr('content'),
				initialHtml: $('body').html()
			}

			const ws = createWriteStream(resolve('static/crawl.html'), {
				encoding: 'utf-8'
			})

			// 添加基本的 HTML 格式化
			const formattedHtml = response.data
				.replace(/>\s+</g, '>\n<') // 在标签之间添加换行
				.replace(/</g, '\n<') // 在开始标签前添加换行
				.replace(/>/g, '>\n') // 在结束标签后添加换行
				.trim()

			// const formattedHtml = await prettier.format(response.data, {
			//   parser: 'html',
			//   htmlWhitespaceSensitivity: 'ignore',
			//   printWidth: 120,
			// });

			ws.write(formattedHtml)
			ws.end()

			return {
				success: true,
				data: pageData,
				message: '爬取完成'
			}
		} catch (error: any) {
			return {
				success: false,
				error: error.message,
				message: '爬取失败'
			}
		}
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.testService.findOne(+id)
	}

	@Patch(':id')
	update(@Param('id') id: string, @Body() updateTestDto: UpdateDemoDto) {
		return this.testService.update(+id, updateTestDto)
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.testService.remove(+id)
	}
}
