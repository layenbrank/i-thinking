import type { DistributedPlugin } from '@/types/distributed-plugin'

/**
 * MessageSerializer
 *
 * 职责
 * - 将复杂对象安全序列化为 JSON 字符串
 * - 提取可传输对象（ArrayBuffer/MessagePort/ImageBitmap/OffscreenCanvas）
 * - 处理循环引用与特殊类型（Date/RegExp/Map/Set）
 *
 * 注意
 * - 过滤函数、Promise、Symbol、Proxy 等不可序列化对象
 */

/**
 * 跨上下文消息序列化器
 */
export function useMessageSerializer() {
	/**
	 * 检查对象是否可序列化
	 */
	function isSerializable(value: any): boolean {
		if (value === null || value === undefined) return false
		if (typeof value === 'function') return false
		if (typeof value === 'symbol') return false
		if (value instanceof Promise) return false
		if (typeof value === 'object' && value.constructor?.name === 'Proxy') return false
		return true
	}

	/**
	 * 检查是否为可传输对象
	 */
	function isTransferable(obj: any): obj is DistributedPlugin.Transferable {
		return (
			obj instanceof ArrayBuffer ||
			obj instanceof MessagePort ||
			(typeof ImageBitmap !== 'undefined' && obj instanceof ImageBitmap) ||
			(typeof OffscreenCanvas !== 'undefined' && obj instanceof OffscreenCanvas)
		)
	}

	/**
	 * 提取可传输对象
	 */
	function extractTransferables(data: any): DistributedPlugin.Transferable[] {
		const transferables: DistributedPlugin.Transferable[] = []
		const seen = new WeakSet()

		function extract(obj: any) {
			if (obj === null || typeof obj !== 'object') return
			if (seen.has(obj)) return
			seen.add(obj)

			if (isTransferable(obj)) {
				transferables.push(obj)
				return
			}

			if (Array.isArray(obj)) {
				obj.forEach(extract)
			} else {
				Object.values(obj).forEach(extract)
			}
		}

		extract(data)
		return transferables
	}

	/**
	 * 序列化数据
	 */
	function serialize<T = any>(data: T): string {
		const seen = new WeakMap()
		let counter = 0

		function replacer(_key: string, value: any): any {
			// 处理循环引用
			if (value !== null && typeof value === 'object') {
				if (seen.has(value)) {
					return { $ref: seen.get(value) }
				}
				const id = `$obj_${counter++}`
				seen.set(value, id)
			}

			// 过滤不可序列化对象
			if (!isSerializable(value)) {
				return undefined
			}

			// 处理特殊类型
			if (value instanceof Date) {
				return { $type: 'Date', value: value.toISOString() }
			}
			if (value instanceof RegExp) {
				return { $type: 'RegExp', source: value.source, flags: value.flags }
			}
			if (value instanceof Map) {
				return { $type: 'Map', entries: Array.from(value.entries()) }
			}
			if (value instanceof Set) {
				return { $type: 'Set', values: Array.from(value.values()) }
			}

			return value
		}

		return JSON.stringify(data, replacer)
	}

	/**
	 * 反序列化数据
	 */
	function deserialize<T = any>(json: string): T {
		const refMap = new Map<string, any>()

		function reviver(_key: string, value: any): any {
			// 处理循环引用
			if (value?.$ref) {
				return refMap.get(value.$ref)
			}

			// 处理特殊类型
			if (value?.$type) {
				switch (value.$type) {
					case 'Date':
						return new Date(value.value)
					case 'RegExp':
						return new RegExp(value.source, value.flags)
					case 'Map':
						return new Map(value.entries)
					case 'Set':
						return new Set(value.values)
				}
			}

			// 存储对象引用
			if (value !== null && typeof value === 'object') {
				const id = `$obj_${refMap.size}`
				refMap.set(id, value)
			}

			return value
		}

		return JSON.parse(json, reviver)
	}

	/**
	 * 创建可传输消息
	 */
	function createTransferableMessage<T = any>(
		data: T
	): {
		message: DistributedPlugin.SerializableMessage
		transfer: DistributedPlugin.Transferable[]
	} {
		const transfer = extractTransferables(data)

		return {
			message: {
				type: 'data',
				payload: data,
				transfer
			},
			transfer
		}
	}

	/**
	 * 使用 Structured Clone Algorithm
	 */
	function structuredClone<T>(data: T): T {
		// 浏览器原生支持
		if (typeof window !== 'undefined' && 'structuredClone' in window) {
			return window.structuredClone(data)
		}

		// 降级方案：使用 MessageChannel
		return new Promise<T>((resolve) => {
			const channel = new MessageChannel()
			channel.port1.onmessage = (e) => resolve(e.data)
			channel.port2.postMessage(data)
		}) as any
	}

	return {
		isSerializable,
		isTransferable,
		extractTransferables,
		serialize,
		deserialize,
		createTransferableMessage,
		structuredClone
	}
}

export type MessageSerializer = ReturnType<typeof useMessageSerializer>
