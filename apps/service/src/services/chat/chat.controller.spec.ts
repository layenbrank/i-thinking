import { Test, type TestingModule } from '@nestjs/testing'
import type { Response } from 'express'

import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'

// `ai` / provider 包是 ESM，jest 的 CJS 运行时加载会失败；
// 控制器用例不关心它们，与 chat.service.spec.ts 同样桩掉。
jest.mock('ai', function () {
  return {
    convertToModelMessages: jest.fn(function (messages: unknown[]): unknown[] {
      return messages
    }),
    streamText: jest.fn(function () {
      return { pipeUIMessageStreamToResponse: jest.fn(function (): void {}) }
    })
  }
})

jest.mock('@ai-sdk/openai-compatible', function () {
  return {
    createOpenAICompatible: jest.fn(function () {
      return { chatModel: jest.fn() }
    })
  }
})

describe('ChatController', function () {
  let controller: ChatController
  const stream = jest.fn(async function () {})

  beforeEach(async function () {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: { stream } }]
    }).compile()

    controller = moduleRef.get(ChatController)
  })

  it('把请求交给 ChatService.stream，并传入原始响应（SSE 直写）', async function () {
    const response = {} as Response
    const dto = { messages: [] } as never

    await controller.send(dto, response)

    expect(stream).toHaveBeenCalledWith(dto, response)
  })
})
