import { http } from '@/utils/http/http.ts'
import { INTELLIGENCE_TOKEN } from '@/utils/http/token.ts'

import * as z from 'zod'

const RoleSchema = z.enum(['system', 'assistant', 'user', 'tool'])

const ModelSchema = z.enum(['qwen3:8b', 'deepseek-r1:8b'])

export const MessageSchema = z.object({
	role: RoleSchema,
	content: z.string()
})

const CommunicateSchema = z.object({
	model: ModelSchema,
	created_at: z.coerce.string(),
	message: MessageSchema,
	done: z.boolean(),
	done_reason: z.string().optional(),
	total_duration: z.number().optional(),
	load_duration: z.number().optional(),
	prompt_eval_count: z.number().optional(),
	prompt_eval_duration: z.number().optional(),
	eval_count: z.number().optional(),
	eval_duration: z.number().optional()
})

export declare namespace Communicate {
	export interface Params {
		model: Model
		raw?: boolean
		stream?: boolean
		messages: Message[]
	}

	export type Response = z.infer<typeof CommunicateSchema>

	export type Role = z.infer<typeof RoleSchema>

	export type Model = z.infer<typeof ModelSchema>

	export type Message = z.infer<typeof MessageSchema>
}

// SSE server sent events
export function POST_COMMUNICATE(data: Communicate.Params) {
	return fetch(`${import.meta.env.VITE_INTELLIGENCE}/chat`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/x-ndjson'
			// Accept: 'text/event-stream'
		},
		signal: AbortSignal.timeout(1000 * 60 * 3), // 3分钟超时
		body: JSON.stringify(data)
	})
}

export async function* GeneratorJSON<R>(
	callback: () => Promise<Response>
): AsyncGenerator<R, void, unknown> {
	const response = await callback()
	if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
	if (!response.body) throw new Error('ReadableStream not supported in this browser.')

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
			// console.log('[chunk value]', done ? chunk : JSON.parse(chunk))
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

// TODO: 暂未完善 GeneratorSSE 函数
export async function* GeneratorSSE<R>(
	callback: () => Promise<Response>
): AsyncGenerator<R, void, unknown> {
	const response = await callback()
	if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
	if (!response.body) throw new Error('ReadableStream not supported in this browser.')

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
