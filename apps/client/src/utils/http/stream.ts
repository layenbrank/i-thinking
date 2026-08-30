/**
 * 流式响应解析：NDJSON（Ollama / corex）与 SSE（OpenAI 兼容）
 */

type Fetcher = (...args: any[]) => Promise<Response>

async function* readLines<F extends Fetcher>(fetcher: F): AsyncGenerator<string, void, unknown> {
  const response = await fetcher()
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  if (!response.body)
    throw new Error('ReadableStream not supported in this browser.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      const chunk = decoder.decode(value, { stream: !done })
      buffer += chunk
      const parts = buffer.split('\n')

      // 最后一行可能是不完整的，留待下次解析
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        const trimmed = part.trim()
        if (!trimmed) continue
        yield trimmed
      }
      if (done) break
    }

    // 流结束时，缓冲区中可能还有一个没有换行符的记录
    if (buffer.trim()) yield buffer.trim()
  } finally {
    reader.releaseLock()
  }
}

/** 逐行解析 NDJSON 响应体 */
async function* GeneratorJSON<F extends Fetcher, T = unknown>(
  fetcher: F
): AsyncGenerator<T, void, unknown> {
  for await (const line of readLines(fetcher)) {
    try {
      yield JSON.parse(line) as T
    } catch (error) {
      console.error('Failed to parse JSON:', error, line)
    }
  }
}

/** 逐条解析 SSE `data:` 事件，跳过 `[DONE]` 哨兵 */
async function* GeneratorSSE<F extends Fetcher, T = unknown>(
  fetcher: F
): AsyncGenerator<T, void, unknown> {
  for await (const line of readLines(fetcher)) {
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (!payload || payload === '[DONE]') continue
    try {
      yield JSON.parse(payload) as T
    } catch (error) {
      console.error('Failed to parse SSE payload:', error, payload)
    }
  }
}

export { GeneratorJSON, GeneratorSSE }
export type { Fetcher }
