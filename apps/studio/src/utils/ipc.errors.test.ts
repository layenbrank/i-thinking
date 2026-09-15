import { describe, expect, it } from 'vitest'

import { IpcClientError, encodeIpcMessage } from '@/shared/ipc/error'

import { toIpcFailure, toIpcMessage } from './ipc.errors'

describe('toIpcFailure', function () {
  it('recovers the code from the message prefix', function () {
    // 跨 contextBridge 后自定义属性丢失，只剩 message —— 这是渲染侧的唯一来源
    const failure = toIpcFailure(new Error(encodeIpcMessage('USER_RECORD_NOT_FOUND', '记录不存在: u1')))
    expect(failure.code).toBe('USER_RECORD_NOT_FOUND')
    expect(failure.message).toBe('记录不存在: u1')
  })

  it('recovers the code from a thrown IpcClientError', function () {
    const failure = toIpcFailure(new IpcClientError('CHAT_PROVIDER_NOT_FOUND', 'provider 不存在'))
    expect(failure.code).toBe('CHAT_PROVIDER_NOT_FOUND')
    expect(failure.message).toBe('provider 不存在')
  })

  it('degrades an unprefixed error to IPC_UNKNOWN without losing the text', function () {
    const failure = toIpcFailure(new TypeError('boom'))
    expect(failure.code).toBe('IPC_UNKNOWN')
    expect(failure.message).toBe('boom')
  })

  it('handles a non-Error throw', function () {
    expect(toIpcFailure('plain string').code).toBe('IPC_UNKNOWN')
    expect(toIpcFailure('plain string').message).toBe('plain string')
  })
})

describe('toIpcMessage', function () {
  it('strips the [CODE] prefix so users never see error codes', function () {
    const error = new Error(encodeIpcMessage('DOC_TIMEOUT', 'pandoc 转换超时'))
    expect(toIpcMessage(error, '转换失败')).toBe('pandoc 转换超时')
  })

  it('falls back when the message body is empty', function () {
    expect(toIpcMessage(new Error('[SIDECAR_NOT_READY] '), '服务未就绪')).toBe('服务未就绪')
  })

  it('falls back for an unprefixed empty message', function () {
    expect(toIpcMessage(new Error(''), '未知错误')).toBe('未知错误')
  })
})
