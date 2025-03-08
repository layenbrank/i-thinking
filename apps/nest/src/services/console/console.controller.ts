import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';

import { ConsoleService } from './console.service';
import { CreateConsoleDto } from './dto/create-console.dto';
import { UpdateConsoleDto } from './dto/update-console.dto';

@Controller('console')
export class ConsoleController {
  constructor(private readonly consoleService: ConsoleService) {}

  @Post()
  create(@Body() createConsoleDto: CreateConsoleDto) {
    console.log('console', createConsoleDto.msg);
    return this.consoleService.create(createConsoleDto);
  }

  @Get()
  findAll() {
    
    return this.consoleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    console.log('console', id);
    return this.consoleService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateConsoleDto: UpdateConsoleDto) {
    return this.consoleService.update(+id, updateConsoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.consoleService.remove(+id);
  }
}
