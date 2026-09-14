import { ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test, type TestingModule } from '@nestjs/testing'
import { convertToModelMessages, streamText } from 'ai'
import type { ServerResponse } from 'node:http'

import { ChatService } from './chat.service'

jest.mock('ai', function () {
  return {
    convertToModelMessages: jest.fn(function (messages: unknown[]): unknown[] {
      return messages
    }),
    streamText: jest.fn(function () {
      return {
        pipeUIMessageStreamToResponse: jest.fn(function (): void {})
      }
    })
  }
})

jest.mock('@ai-sdk/openai-compatible', function () {
  return {
    createOpenAICompatible: jest.fn(function () {
      return {
        chatModel: jest.fn(function (modelID: string) {
          return { modelID }
        })
      }
    })
  }
})

type Env = Record<string, string | undefined>

/** 用桩 ConfigService：只关心 env 读取结果，不引入 ConfigModule */
async function buildService(env: Env): Promise<ChatService> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      ChatService,
      {
        provide: ConfigService,
        useValue: {
          get: function (key: string): string | undefined {
            return env[key]
          }
        }
      }
    ]
  }).compile()

  return moduleRef.get(ChatService)
}

const RESPONSE = {} as ServerResponse
const MESSAGES = [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: '你好' }] }] as never

beforeEach(function () {
  jest.clearAllMocks()
})

describe('ChatService', function () {
  it('未配置 AI_BASE_URL 时抛 503', async function () {
    const service = await buildService({ AI_MODEL: 'qwen3:8b' })

    await expect(service.stream({ messages: MESSAGES }, RESPONSE)).rejects.toBeInstanceOf(
      ServiceUnavailableException
    )
  })

  it('未配置 AI_MODEL 且请求未指定模型时抛 503', async function () {
    const service = await buildService({ AI_BASE_URL: 'http://127.0.0.1:11434' })

    await expect(service.stream({ messages: MESSAGES }, RESPONSE)).rejects.toThrow(
      '未配置 AI_MODEL'
    )
  })

  it('正常路径：转换消息 → streamText → 写 UI 消息流', async function () {
    const service = await buildService({
      AI_BASE_URL: 'http://127.0.0.1:11434',
      AI_MODEL: 'qwen3:8b',
      AI_PROVIDER_NAME: 'ollama'
    })

    await service.stream({ messages: MESSAGES }, RESPONSE)

    expect(convertToModelMessages).toHaveBeenCalledWith(MESSAGES)
    const [options] = jest.mocked(streamText).mock.calls[0] as unknown as [Record<string, unknown>]
    expect(options.messages).toBeDefined()
    expect(options).not.toHaveProperty('system')
  })

  it('请求里的 model / system 覆盖默认值', async function () {
    const service = await buildService({
      AI_BASE_URL: 'http://127.0.0.1:11434',
      AI_MODEL: 'qwen3:8b'
    })

    await service.stream({ messages: MESSAGES, model: 'llama3.2:3b', system: '你是助手' }, RESPONSE)

    const [options] = jest.mocked(streamText).mock.calls[0] as unknown as [Record<string, unknown>]
    expect(options.system).toBe('你是助手')
  })
})
