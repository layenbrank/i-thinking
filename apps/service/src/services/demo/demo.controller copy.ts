import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common'
import * as cheerio from 'cheerio'
import axios from 'axios'
import { DemoService } from './demo.service'
import { CreateDemoDto } from './dto/create-demo.dto'
import { UpdateDemoDto } from './dto/update-demo.dto'

// 小红书 https://www.xiaohongshu.com/explore
@Controller('test')
export class TestController {
	constructor(private readonly testService: DemoService) {}

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

			return {
				success: true,
				data: pageData,
				message: '爬取完成'
			}
		} catch (error) {
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
