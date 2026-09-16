import { describe, expect, it } from 'vitest'

import {
  decodeIpcMessage,
  encodeIpcMessage,
  envelopeFail,
  envelopeOk,
  IpcClientError,
  IpcError,
  IPC_ERROR_CODES,
  toErrorPayload,
  toZodDetails
} from './error'

describe('ipc message codec', function () {
  it('round-trips a known code', function () {
    const encoded = encodeIpcMessage('CHAT_PROVIDER_NOT_FOUND', 'provider 不存在: abc')
    expect(encoded).toBe('[CHAT_PROVIDER_NOT_FOUND] provider 不存在: abc')

    const decoded = decodeIpcMessage(encoded)
    expect(decoded.code).toBe('CHAT_PROVIDER_NOT_FOUND')
    expect(decoded.message).toBe('provider 不存在: abc')
  })

  it('degrades an unknown prefix to IPC_UNKNOWN but keeps the text', function () {
    const decoded = decodeIpcMessage('[NOT_A_REAL_CODE] boom')
    expect(decoded.code).toBe('IPC_UNKNOWN')
    expect(decoded.message).toBe('boom')
  })

  it('treats an unprefixed message as IPC_UNKNOWN without truncating it', function () {
    const decoded = decodeIpcMessage('plain failure')
    expect(decoded.code).toBe('IPC_UNKNOWN')
    expect(decoded.message).toBe('plain failure')
  })

  it('tolerates a message body that itself starts with a bracket', function () {
    const decoded = decodeIpcMessage(encodeIpcMessage('DOC_TIMEOUT', '[pandoc] 超时'))
    expect(decoded.code).toBe('DOC_TIMEOUT')
    expect(decoded.message).toBe('[pandoc] 超时')
  })
})

describe('ipc client error', function () {
  it('carries the code in its message so it survives contextBridge', function () {
    const error = new IpcClientError('USER_RECORD_NOT_FOUND', '记录不存在: x')
    expect(error.message).toBe('[USER_RECORD_NOT_FOUND] 记录不存在: x')
    expect(decodeIpcMessage(error.message).code).toBe('USER_RECORD_NOT_FOUND')
  })

  it('also exposes code as a property (lost across the bridge, usable in preload)', function () {
    const error = new IpcClientError('SIDECAR_NOT_READY', 'not ready')
    expect(error.code).toBe('SIDECAR_NOT_READY')
    expect(error.name).toBe('IpcClientError')
  })

  it('attaches the original stack when provided', function () {
    const error = new IpcClientError('IPC_UNKNOWN', 'boom', { stack: 'main-stack' })
    expect(error.stack).toBe('main-stack')
  })
})

describe('toErrorPayload', function () {
  it('preserves the code of an IpcError and hides the stack in prod', function () {
    const payload = toErrorPayload(new IpcError('OVERLAY_UNAVAILABLE', '浮层不可用'))
    expect(payload).toEqual({
      code: 'OVERLAY_UNAVAILABLE',
      name: 'IpcError',
      message: '浮层不可用'
    })
    expect(payload.stack).toBeUndefined()
  })

  it('includes the stack in dev', function () {
    const payload = toErrorPayload(new IpcError('DEVTOOLS_DISABLED', '禁用'), { isDev: true })
    expect(payload.stack).toBeTypeOf('string')
  })

  it('carries IpcError details through', function () {
    const payload = toErrorPayload(
      new IpcError('CHAT_SESSION_NOT_FOUND', 'session 不存在', { details: { id: 's1' } })
    )
    expect(payload.details).toEqual({ id: 's1' })
  })

  it('maps an unexpected throw to IPC_HANDLER_ERROR', function () {
    const payload = toErrorPayload(new TypeError('undefined is not a function'))
    expect(payload.code).toBe('IPC_HANDLER_ERROR')
    expect(payload.name).toBe('TypeError')
    expect(payload.message).toBe('undefined is not a function')
  })

  it('handles a non-Error throw without crashing', function () {
    const payload = toErrorPayload('just a string')
    expect(payload.code).toBe('IPC_HANDLER_ERROR')
    expect(payload.message).toBe('just a string')
  })
})

describe('toZodDetails', function () {
  it('flattens zod issues into clone-safe plain objects', function () {
    const details = toZodDetails({
      issues: [
        { path: ['email'], code: 'invalid_format', message: 'Invalid email' },
        { path: ['nested', 'id'], code: 'invalid_type', message: 'Expected string' }
      ]
    })
    expect(details).toEqual([
      { path: 'email', code: 'invalid_format', message: 'Invalid email' },
      { path: 'nested.id', code: 'invalid_type', message: 'Expected string' }
    ])
    expect(function () {
      structuredClone(details)
    }).not.toThrow()
  })
})

describe('envelope clone safety', function () {
  it('keeps failure envelopes structured-clone safe', function () {
    const failures = [
      envelopeFail({ code: 'IPC_UNTRUSTED_SENDER', name: 'IpcError', message: 'nope' }),
      envelopeFail({
        code: 'IPC_INVALID_PAYLOAD',
        name: 'IpcError',
        message: 'bad',
        details: toZodDetails({
          issues: [{ path: ['key'], code: 'too_small', message: 'too short' }]
        })
      }),
      envelopeFail(toErrorPayload(new IpcError('DOC_TIMEOUT', '超时', { details: { ms: 1000 } })))
    ]

    for (const envelope of failures) {
      expect(function () {
        structuredClone(envelope)
      }).not.toThrow()
    }
  })

  it('omits undefined optional keys from the payload', function () {
    const payload = toErrorPayload(new IpcError('IPC_UNKNOWN', 'x'))
    expect('details' in payload).toBe(false)
    expect('stack' in payload).toBe(false)
    expect(Object.keys(payload).sort()).toEqual(['code', 'message', 'name'])
  })

  it('envelopeOk wraps data', function () {
    expect(envelopeOk({ id: '1' })).toEqual({ ok: true, data: { id: '1' } })
  })
})

describe('error code vocabulary', function () {
  it('has no duplicates', function () {
    expect(new Set(IPC_ERROR_CODES).size).toBe(IPC_ERROR_CODES.length)
  })

  it('uses SCREAMING_SNAKE_CASE for every code', function () {
    for (const code of IPC_ERROR_CODES) {
      expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/)
    }
  })
})
