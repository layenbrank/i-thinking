import { http } from '@/utils/http/http.ts'
import { INTELLIGENCE_TOKEN } from '@/utils/http/token.ts'

type CommunicateParams = Application.Intelligence.Communicate.Params
type CommunicateResponse = Application.Intelligence.Communicate.Response

// SSE server sent events
export function POST_COMMUNICATE(
  data: CommunicateParams,
  options?: { signal?: AbortSignal }
) {
  const token = 'b38cf8b7ca1e4bb18b00893d66093c00.WgxFSgb9H0u4CdE0twgqsqNB'
  const timeoutSignal = AbortSignal.timeout(1000 * 60 * 10)
  const signal = options?.signal
    ? typeof AbortSignal.any === 'function'
      ? AbortSignal.any([options.signal, timeoutSignal])
      : options.signal
    : timeoutSignal
  // return fetch(`${ENVURL.intelligence}/chat`, {
  return fetch(`/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
      Authorization: `Bearer ${token}`
      // Accept: 'text/event-stream'
    },
    signal: signal, // 10分钟超时或外部中止
    body: JSON.stringify(data)
  })
}

export async function* GeneratorJSON<
  F extends (...args: any[]) => Promise<Response>,
  T = CommunicateResponse
>(fetcher: F): AsyncGenerator<T, void, unknown> {
  const response = await fetcher()
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  if (!response.body)
    throw new Error('ReadableStream not supported in this browser.')

  const reader = response.body?.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  try {
    while (true) {
      if (!reader) break

      const { value, done } = await reader.read()
      const chunk = decoder.decode(value, { stream: !done })
      buffer += chunk
      const parts = buffer.split('\n')

      // 最后一行可能是不完整的，留待下次解析
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        const trimmed = part.trim()

        if (!trimmed) continue
        try {
          const parsed = JSON.parse(trimmed) as T
          yield parsed
        } catch (error) {
          console.error('Failed to parse JSON:', error, trimmed)
        }
      }
      // console.log('[chunk value]', done ? chunk : JSON.parse(chunk))
      if (done) break
    }

    // 处理缓冲区中剩余的内容（流结束时，缓冲区中可能还有一个没有换行符的记录）
    if (buffer.trim()) {
      try {
        const trimmed = buffer.trim()
        const parsed = JSON.parse(trimmed)
        yield parsed
      } catch (error) {
        console.error('Failed to parse remaining buffer:', error, buffer)
      }
    }
  } catch (error) {
    console.error('Error reading stream:', error)
  } finally {
    reader?.releaseLock()
  }
}

// TODO: 暂未完善 GeneratorSSE 函数
export async function* GeneratorSSE<R>(
  callback: () => Promise<Response>
): AsyncGenerator<R, void, unknown> {
  const response = await callback()
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  if (!response.body)
    throw new Error('ReadableStream not supported in this browser.')

  const reader = response.body?.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  try {
    while (true) {
      if (!reader) break

      const { value, done } = await reader.read()

      const chunk = decoder.decode(value, { stream: !done })
      buffer += chunk
      const parts = buffer.split('\n')

      // 最后一行可能是不完整的，留待下次解析
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        const trimmed = part.trim()

        if (!trimmed) continue
        try {
          yield JSON.parse(trimmed)
        } catch (error) {
          console.error('Failed to parse JSON:', error, trimmed)
        }
      }
      if (done) break
    }

    // 处理缓冲区中剩余的内容（流结束时，缓冲区中可能还有一个没有换行符的记录）
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer.trim())
      } catch (error) {
        console.error('Failed to parse remaining buffer:', error, buffer)
      }
    }
  } catch (error) {
    console.error('Error reading stream:', error)
  } finally {
    reader?.releaseLock()
  }
}

export function GET_TAGS() {
  return http.get('/tags', {
    context: INTELLIGENCE_TOKEN
  })
}

export function GET_CHAT_HISTORY(params: { userId: string }) {
  return http.get('/chat/history', {
    context: INTELLIGENCE_TOKEN,
    params
  })
}

/**
 * @deprecated 该方法已废弃，建议使用 POST_COMMUNICATE 结合 GeneratorJSON 使用
 */
export function POST_COMMUNICATE_BACKUP() {
  http
    .post(
      // '/tags',
      '/chat',
      // '/generate',
      {
        model: 'qwen3:8b',
        stream: true,
        raw: true,
        messages: [
          {
            role: 'user',
            content: '你好'
          }
        ]
      },
      {
        context: INTELLIGENCE_TOKEN,
        headers: {
          // Accept: 'text/event-stream',
          // 'Content-Type': 'application/x-ndjson'
          Accept: '*/*',
          'Content-Type': 'application/json'
        },
        // observe: 'body',
        observe: 'events',
        // observe: 'response',
        responseType: 'text'
        // responseType: 'json'
        // responseType: 'arraybuffer'
        // responseType: 'blob'
      }
    )
    .subscribe({
      next(value) {
        // if (!value.type) return

        console.log('[value]', value)
      },
      error(err) {
        console.error('[error]', err)
      },
      complete() {
        console.log('[complete]')
      }
    })
}
