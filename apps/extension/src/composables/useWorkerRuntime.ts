/**
 * Worker Runtime 管理
 * 用于管理插件 Worker 的生命周期
 *
 * 能力
 * - Worker 启停、自动重启
 * - 心跳健康检查与最后心跳时间记录
 * - RPC 风格的请求/响应封装与超时处理
 * - 插件注册与方法远程执行
 */

import { onUnmounted, readonly, ref } from 'vue'
import { useMessageSerializer } from './useMessageSerializer'

/**
 * Worker 消息类型
 */
export enum WorkerMessageType {
	INIT = 'init',
	REGISTER_PLUGIN = 'register_plugin',
	EXECUTE = 'execute',
	RESULT = 'result',
	ERROR = 'error',
	HEARTBEAT = 'heartbeat',
	TERMINATE = 'terminate'
}

/**
 * Worker 配置
 */
export interface WorkerRuntimeConfig {
	/** Worker 脚本路径 */
	workerUrl: string
	/** 心跳间隔（毫秒） */
	heartbeatInterval?: number
	/** 超时时间（毫秒） */
	timeout?: number
	/** 是否自动重启 */
	autoRestart?: boolean
}

/**
 * Worker Runtime 管理器
 */
export function useWorkerRuntime(config: WorkerRuntimeConfig) {
	const { workerUrl, heartbeatInterval = 5000, timeout = 30000, autoRestart = true } = config

	const serializer = useMessageSerializer()

	// Worker 实例
	let worker: Worker | null = null

	// 状态
	const isRunning = ref(false)
	const isHealthy = ref(false)
	const lastHeartbeat = ref<number>(0)

	// 待处理的请求
	const pendingRequests = new Map<
		string,
		{
			resolve: (value: any) => void
			reject: (reason: any) => void
			timeout: ReturnType<typeof setTimeout>
		}
	>()

	// 心跳定时器
	let heartbeatTimer: ReturnType<typeof setInterval> | null = null

	/**
	 * 生成请求 ID
	 */
	function generateRequestId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
	}

	/**
	 * 发送消息到 Worker
	 */
	function postMessage(type: WorkerMessageType, payload: any): Promise<any> {
		return new Promise((resolve, reject) => {
			if (!worker || !isRunning.value) {
				reject(new Error('Worker is not running'))
				return
			}

			const requestId = generateRequestId()
			const message = serializer.createTransferableMessage({
				id: requestId,
				type,
				payload
			})

			// 设置超时
			const timeoutTimer = setTimeout(() => {
				pendingRequests.delete(requestId)
				reject(new Error(`Request timeout: ${type}`))
			}, timeout)

			// 保存请求
			pendingRequests.set(requestId, {
				resolve,
				reject,
				timeout: timeoutTimer
			})

			// 发送消息
			worker.postMessage(message.message, message.transfer)
		})
	}

	/**
	 * 处理 Worker 消息
	 */
	function handleWorkerMessage(event: MessageEvent) {
		const message = serializer.deserialize(event.data)
		const { id, type, payload } = message

		switch (type) {
			case WorkerMessageType.RESULT:
			case WorkerMessageType.ERROR: {
				const request = pendingRequests.get(id)
				if (request) {
					clearTimeout(request.timeout)
					pendingRequests.delete(id)

					if (type === WorkerMessageType.RESULT) {
						request.resolve(payload)
					} else {
						request.reject(new Error(payload.message ?? 'Worker error'))
					}
				}
				break
			}

			case WorkerMessageType.HEARTBEAT:
				lastHeartbeat.value = Date.now()
				isHealthy.value = true
				break

			default:
				console.warn('[WorkerRuntime] Unknown message type:', type)
		}
	}

	/**
	 * 处理 Worker 错误
	 */
	function handleWorkerError(event: ErrorEvent) {
		console.error('[WorkerRuntime] Worker error:', event.error)
		isHealthy.value = false

		// 拒绝所有待处理的请求
		pendingRequests.forEach((request) => {
			clearTimeout(request.timeout)
			request.reject(new Error('Worker crashed'))
		})
		pendingRequests.clear()

		// 自动重启
		if (autoRestart && isRunning.value) {
			console.log('[WorkerRuntime] Auto restarting worker...')
			void restart()
		}
	}

	/**
	 * 启动 Worker
	 */
	async function start(): Promise<void> {
		if (isRunning.value) {
			console.warn('[WorkerRuntime] Worker already running')
			return
		}

		try {
			// 创建 Worker
			worker = new Worker(workerUrl, { type: 'module' })

			// 设置事件监听
			worker.addEventListener('message', handleWorkerMessage)
			worker.addEventListener('error', handleWorkerError)

			// 初始化 Worker
			await postMessage(WorkerMessageType.INIT, {})

			isRunning.value = true
			isHealthy.value = true
			lastHeartbeat.value = Date.now()

			// 启动心跳检查
			heartbeatTimer = setInterval(() => {
				const now = Date.now()
				const elapsed = now - lastHeartbeat.value

				if (elapsed > heartbeatInterval * 2) {
					console.warn('[WorkerRuntime] Heartbeat timeout')
					isHealthy.value = false

					if (autoRestart) {
						void restart()
					}
				} else {
					// 发送心跳请求
					void postMessage(WorkerMessageType.HEARTBEAT, {})
				}
			}, heartbeatInterval)

			console.log('[WorkerRuntime] Started')
		} catch (error) {
			console.error('[WorkerRuntime] Failed to start:', error)
			stop()
			throw error
		}
	}

	/**
	 * 停止 Worker
	 */
	function stop(): void {
		if (!isRunning.value) {
			return
		}

		// 清除心跳定时器
		if (heartbeatTimer) {
			clearInterval(heartbeatTimer)
			heartbeatTimer = null
		}

		// 终止 Worker
		if (worker) {
			worker.postMessage({
				type: WorkerMessageType.TERMINATE,
				payload: {}
			})
			worker.terminate()
			worker = null
		}

		// 拒绝所有待处理的请求
		pendingRequests.forEach((request) => {
			clearTimeout(request.timeout)
			request.reject(new Error('Worker stopped'))
		})
		pendingRequests.clear()

		isRunning.value = false
		isHealthy.value = false

		console.log('[WorkerRuntime] Stopped')
	}

	/**
	 * 重启 Worker
	 */
	async function restart(): Promise<void> {
		stop()
		await start()
	}

	/**
	 * 注册插件
	 */
	async function registerPlugin(name: string, plugin: any): Promise<void> {
		await postMessage(WorkerMessageType.REGISTER_PLUGIN, {
			name,
			plugin
		})
	}

	/**
	 * 执行插件方法
	 */
	async function execute<T = any>(pluginName: string, method: string, ...args: any[]): Promise<T> {
		const serializedArgs = args.map((arg) => serializer.serialize(arg))

		const result = await postMessage(WorkerMessageType.EXECUTE, {
			pluginName,
			method,
			args: serializedArgs
		})

		return serializer.deserialize(result)
	}

	// 组件卸载时清理
	onUnmounted(() => {
		stop()
	})

	return {
		isRunning: readonly(isRunning),
		isHealthy: readonly(isHealthy),
		lastHeartbeat: readonly(lastHeartbeat),
		start,
		stop,
		restart,
		registerPlugin,
		execute
	}
}

export type WorkerRuntime = ReturnType<typeof useWorkerRuntime>
