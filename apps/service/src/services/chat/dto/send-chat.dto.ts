import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator'
import type { UIMessage } from 'ai'

/**
 * 一次对话请求。
 *
 * `messages` 直接是 AI SDK 的 `UIMessage` 数组（渲染进程侧的 assistant-ui 就是按它组织的），
 * 深层结构交给 `convertToModelMessages` 处理，这里只做形状与体积的粗校验。
 */
export class SendChatDto {
  @ApiProperty({ description: 'AI SDK UIMessage 数组', type: 'array', items: { type: 'object' } })
  @IsArray()
  @MaxLength(200, { each: true })
  messages!: UIMessage[]

  @ApiPropertyOptional({ description: '模型 id；缺省用 AI_MODEL' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string

  @ApiPropertyOptional({ description: '系统提示词' })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  system?: string
}
