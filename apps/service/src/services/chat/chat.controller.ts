import { Body, Controller, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'

import { JWTAuthGuard } from '@/guards/auth.guard'

import { ChatService } from './chat.service'
import { SendChatDto } from './dto/send-chat.dto'

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '流式对话（AI SDK UI 消息流）' })
  async send(@Body() dto: SendChatDto, @Res() response: Response): Promise<void> {
    await this.chatService.stream(dto, response)
  }
}
