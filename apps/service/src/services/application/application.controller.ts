import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApplicationService } from './application.service'
import { CreateApplicationDto } from './dto/create-application.dto'
import { UpdateApplicationDto } from './dto/update-application.dto'

@Controller('application')
export class ApplicationController {
	constructor(private readonly applicationService: ApplicationService) {}

	@Post()
	create(@Body() createApplicationDto: CreateApplicationDto) {
		return this.applicationService.insert(createApplicationDto)
	}

	@Get()
	findAll() {
		return this.applicationService.findAll()
	}

	@Get('singleton/*id')
	findOne(@Param('id') id: string) {
		return this.applicationService.findOne(+id)
	}

	@Patch(':id')
	update(@Param('id') id: string, @Body() updateApplicationDto: UpdateApplicationDto) {
		return this.applicationService.update(+id, updateApplicationDto)
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.applicationService.remove(+id)
	}

	/*
		1. @Query - 查询参数
		用于获取 URL 查询字符串中的参数（? 后面的参数）

		2. @Param - 路径参数
		用于获取 URL 路径中的动态参数（: 定义的参数）
	 */
	@Get('favicon')
	async findFavicon(@Query('url') url: string) {
		console.log(`Fetching favicon for URL: ${url}`)

		const decodedUrl = decodeURIComponent(url)
		console.log(`Decoded URL: ${decodedUrl}`)

		const resp = await this.applicationService.findFavicon(url)
		return resp
	}
}
