import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common'
import { SlideAppService } from './slide-app.service'
import { CreateSlideAppDto } from './dto/create-slide-app.dto'
import { UpdateSlideAppDto } from './dto/update-slide-app.dto'

@Controller('slide-app')
export class SlideAppController {
  constructor(private readonly slideAppService: SlideAppService) {}

  @Post()
  create(@Body() createSlideAppDto: CreateSlideAppDto) {
    return this.slideAppService.create(createSlideAppDto)
  }

  @Get()
  findAll() {
    return this.slideAppService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.slideAppService.findOne(+id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSlideAppDto: UpdateSlideAppDto) {
    return this.slideAppService.update(+id, updateSlideAppDto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.slideAppService.remove(+id)
  }
}
