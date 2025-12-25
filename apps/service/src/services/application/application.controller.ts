import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApplicationService } from './application.service'
import { InsertDTO } from './dto/create-application.dto'
import { UpdateDTO } from './dto/update-application.dto'

@Controller('application')
export class ApplicationController {
  constructor(private readonly service: ApplicationService) {}

  @Post()
  toInsert(@Body() insertDTO: InsertDTO) {
    return this.service.toInsert(insertDTO)
  }

  @Get()
  toReads() {
    return this.service.toReads()
  }

  @Get('singleton/*id')
  toRead(@Param('id') id: string) {
    return this.service.toRead(+id)
  }

  @Patch(':id')
  toUpdate(@Param('id') id: string, @Body() updateDTO: UpdateDTO) {
    return this.service.toUpdate(+id, updateDTO)
  }

  @Delete(':id')
  toRemove(@Param('id') id: string) {
    return this.service.toRemove(+id)
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

    const resp = await this.service.findFavicon(url)
    return resp
  }
}
