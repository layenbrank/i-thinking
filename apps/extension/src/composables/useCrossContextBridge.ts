import type { DistributedPlugin } from '@/types/distributed-plugin'
import { useMessageSerializer } from './useMessageSerializer'

/**
 * CrossContextBridge
 *
 * 职责
 * - 为 Window/Worker/MessagePort 提供统一的消息通道
 * - 提供 RPC 请求/响应语义、超时控制与错误回传
 * - 可选心跳以检测对端存活并暴露 isConnected 状态
 *
 * 关键点
 * - 严格校验 origin（仅 Window 有意义）
 * - 每个 RPC 请求分配 requestId 并维护 pendingRequests Map
 * - 心跳通过 request/response 消息对维持连接状态
 */

/**
 * 跨上下文通信桥接选项
 */
export interface CrossContextBridgeOptions {
	/** 目标窗口或 Worker */
	target: Window | Worker | MessagePort
	/** 允许的来源（用于 Window） */
	origin?: string
	/** 是否启用心跳检测 */
	heartbeat?: boolean
	/** 心跳间隔（毫秒） */
	heartbeatInterval?: number
	/** 超时时间（毫秒） */
	timeout?: number
}

/**
 * 跨上下文通信桥接
 */
export function useCrossContextBridge(options: CrossContextBridgeOptions) {
	const {
		target,
		origin = '*',
		heartbeat = false,
		heartbeatInterval = 5000,
		timeout = 30000
	} = options

	const serializer = useMessageSerializer()
	const messageHandlers = new Set<(message: DistributedPlugin.SerializableMessage) => void>()
	const pendingRequests = new Map<
		string,
		{
			resolve: (value: any) => void
			reject: (error: Error) => void
			timer: ReturnType<typeof setTimeout>
		}
	>()

	let heartbeatTimer: ReturnType<typeof setInterval> | null = null
	const isConnected = ref(false)
	let requestId = 0

	/**
	 * 生成请求ID
	 */
	function generateRequestId(): string {
		return `req_${Date.now()}_${++requestId}`
	}

	/**
	 * 处理接收到的消息
	 * - 校验来源
	 * - 区分心跳、RPC 响应与普通消息
	 */
	function handleMessage(event: MessageEvent) {
		// 验证来源
		if (origin !== '*' && event.origin !== origin) {
			console.warn(`[Bridge] Message from unauthorized origin: ${event.origin}`)
			return
		}

		const message = event.data as DistributedPlugin.SerializableMessage

		// 处理心跳响应
		if (message.type === 'heartbeat-response') {
			isConnected.value = true
			return
		}

		// 处理 RPC 响应
		if (message.type === 'rpc-response' && message.payload?.requestId) {
			const pending = pendingRequests.get(message.payload.requestId)
			if (pending) {
				clearTimeout(pending.timer)
				pendingRequests.delete(message.payload.requestId)

				if (message.payload.error) {
					pending.reject(new Error(message.payload.error))
				} else {
					pending.resolve(message.payload.result)
				}
			}
			return
		}

		// 通知所有处理器
		messageHandlers.forEach((handler) => {
			try {
				handler(message)
			} catch (error) {
				console.error('[Bridge] Message handler error:', error)
			}
		})
	}

	/**
	 * 发送心跳
	 */
	function sendHeartbeat() {
		postMessage({
			type: 'heartbeat',
			payload: null
		})
	}

	/**
	 * 启动心跳检测
	 */
	function startHeartbeat() {
		if (!heartbeat) return

		heartbeatTimer = setInterval(() => {
			sendHeartbeat()

			// 检测连接状态
			setTimeout(() => {
				if (!isConnected.value) {
					console.warn('[Bridge] Connection lost, attempting to reconnect...')
				}
				isConnected.value = false
			}, 1000)
		}, heartbeatInterval)
	}

	/**
	 * 停止心跳检测
	 */
	function stopHeartbeat() {
		if (heartbeatTimer) {
			clearInterval(heartbeatTimer)
			heartbeatTimer = null
		}
	}

	/**
	 * 发送消息
	 */
	function postMessage(message: DistributedPlugin.SerializableMessage) {
		const { message: msg, transfer } = serializer.createTransferableMessage(message)

		if (target instanceof Worker || target instanceof MessagePort) {
			target.postMessage(msg, transfer)
		} else if (target instanceof Window) {
			target.postMessage(msg, origin, transfer)
		}
	}

	/**
	 * 监听消息
	 */
	function onMessage(handler: (message: DistributedPlugin.SerializableMessage) => void) {
		messageHandlers.add(handler)

		return () => {
			messageHandlers.delete(handler)
		}
	}

	/**
	 * RPC 调用
	 */
	function invoke<T = any>(method: string, ...args: any[]): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const reqId = generateRequestId()

			const timer = setTimeout(() => {
				pendingRequests.delete(reqId)
				reject(new Error(`[Bridge] RPC timeout: ${method}`))
			}, timeout)

			pendingRequests.set(reqId, { resolve, reject, timer })

			postMessage({
				type: 'rpc-request',
				payload: {
					requestId: reqId,
					method,
					args
				}
			})
		})
	}

	/**
	 * 创建远程代理
	 */
	function createProxy<T = any>(targetName: string): DistributedPlugin.ProxyObject<T> {
		return new Proxy(
			{},
			{
				get(_target, prop: string) {
					return async (...args: any[]) => {
						return invoke(`${targetName}.${prop}`, ...args)
					}
				}
			}
		) as DistributedPlugin.ProxyObject<T>
	}

	/**
	 * 创建命名通道
	 */
	function createChannel(name: string) {
		return {
			send: (data: any) => {
				postMessage({
					type: 'channel',
					payload: { channel: name, data }
				})
			},
			onMessage: (handler: (data: any) => void) => {
				const wrapper = (message: DistributedPlugin.SerializableMessage) => {
					if (message.type === 'channel' && message.payload?.channel === name) {
						handler(message.payload.data)
					}
				}
				return onMessage(wrapper)
			}
		}
	}

	/**
	 * 销毁桥接
	 */
	function dispose() {
		stopHeartbeat()
		messageHandlers.clear()

		// 清理所有待处理的请求
		pendingRequests.forEach(({ reject, timer }) => {
			clearTimeout(timer)
			reject(new Error('[Bridge] Bridge disposed'))
		})
		pendingRequests.clear()

		if (target instanceof Worker || target instanceof MessagePort) {
			target.removeEventListener('message', handleMessage as any)
		} else if (target instanceof Window) {
			window.removeEventListener('message', handleMessage)
		}
	}

	/**
	 * 初始化
	 */
	function init() {
		if (target instanceof Worker || target instanceof MessagePort) {
			target.addEventListener('message', handleMessage as any)
		} else if (target instanceof Window) {
			window.addEventListener('message', handleMessage)
		}

		startHeartbeat()
	}

	// 自动初始化
	init()

	return {
		isConnected: readonly(isConnected),
		postMessage,
		onMessage,
		invoke,
		createProxy,
		createChannel,
		dispose
	}
}

export type CrossContextBridge = ReturnType<typeof useCrossContextBridge>
