/**
 * Plugin Worker Runtime
 * 用于在 Worker 中运行插件，实现沙箱隔离和并行处理
 *
 * 职责
 * - 注册/执行插件方法，并通过主线程桥接返回结果
 * - 捕获运行时错误并上报
 * - 回复心跳，报告基本健康状态与已注册插件
 *
 * 注意
 * - 使用 MessageSerializer 封送返回值与 Transferable
 * - 仅在 Worker 环境使用 self.postMessage（带 transfer）
 */

import { useDependencyInjection } from '../composables/useDependencyInjection'
import { useMessageSerializer } from '../composables/useMessageSerializer'

/**
 * Worker 消息类型
 */
enum WorkerMessageType {
  INIT = 'init',
  REGISTER_PLUGIN = 'register_plugin',
  EXECUTE = 'execute',
  RESULT = 'result',
  ERROR = 'error',
  HEARTBEAT = 'heartbeat',
  TERMINATE = 'terminate'
}

/**
 * Worker 上下文
 */
interface WorkerContext {
  plugins: Map<string, any>
  di: ReturnType<typeof useDependencyInjection>
  serializer: ReturnType<typeof useMessageSerializer>
}

/**
 * 创建 Worker 上下文
 */
function createWorkerContext(): WorkerContext {
  return {
    plugins: new Map(),
    di: useDependencyInjection(),
    serializer: useMessageSerializer()
  }
}

/**
 * Worker 全局上下文
 */
const ctx = createWorkerContext()

/**
 * 处理初始化消息
 */
function handleInit(data: any) {
  console.log('[Worker] Initialized with config:', data)
  postMessageToMain({
    type: WorkerMessageType.RESULT,
    payload: { success: true }
  })
}

/**
 * 注册插件
 */
function handleRegisterPlugin(data: any) {
  try {
    const { name, plugin } = data
    ctx.plugins.set(name, plugin)

    // 如果插件有依赖注入配置，注册到 DI 容器
    if (plugin.providers) {
      ctx.di.registerMany(plugin.providers)
    }

    console.log(`[Worker] Plugin registered: ${name}`)
    postMessageToMain({
      type: WorkerMessageType.RESULT,
      payload: { success: true, plugin: name }
    })
  } catch (error) {
    handleError(error, 'register_plugin')
  }
}

/**
 * 执行插件方法
 */
async function handleExecute(data: any) {
  try {
    const { pluginName, method, args } = data
    const plugin = ctx.plugins.get(pluginName)

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`)
    }

    if (typeof plugin[method] !== 'function') {
      throw new Error(`Method not found: ${pluginName}.${method}`)
    }

    // 反序列化参数
    const deserializedArgs = args.map((arg: any) => ctx.serializer.deserialize(arg))

    // 执行方法
    const result = await plugin[method](...deserializedArgs)

    // 序列化结果
    const serializedResult = ctx.serializer.serialize(result)

    postMessageToMain({
      type: WorkerMessageType.RESULT,
      payload: serializedResult
    })
  } catch (error) {
    handleError(error, 'execute')
  }
}

/**
 * 处理心跳消息
 */
function handleHeartbeat() {
  postMessageToMain({
    type: WorkerMessageType.HEARTBEAT,
    payload: {
      timestamp: Date.now(),
      plugins: Array.from(ctx.plugins.keys())
    }
  })
}

/**
 * 处理错误
 */
function handleError(error: unknown, context: string) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error(`[Worker] Error in ${context}:`, error)

  postMessageToMain({
    type: WorkerMessageType.ERROR,
    payload: {
      context,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    }
  })
}

/**
 * 向主线程发送消息
 */
function postMessageToMain(message: any) {
  const serialized = ctx.serializer.createTransferableMessage(message)
  if (serialized.transfer.length > 0) {
    self.postMessage(serialized.message, { transfer: serialized.transfer })
  } else {
    self.postMessage(serialized.message)
  }
}

/**
 * 消息处理器
 */
self.addEventListener('message', (event: MessageEvent) => {
  const { type, payload } = event.data

  try {
    switch (type) {
      case WorkerMessageType.INIT:
        handleInit(payload)
        break

      case WorkerMessageType.REGISTER_PLUGIN:
        handleRegisterPlugin(payload)
        break

      case WorkerMessageType.EXECUTE:
        void handleExecute(payload)
        break

      case WorkerMessageType.HEARTBEAT:
        handleHeartbeat()
        break

      case WorkerMessageType.TERMINATE:
        console.log('[Worker] Terminating...')
        self.close()
        break

      default:
        console.warn('[Worker] Unknown message type:', type)
    }
  } catch (error) {
    handleError(error, 'message_handler')
  }
})

/**
 * 错误处理
 */
self.addEventListener('error', (event: ErrorEvent) => {
  handleError(event.error ?? event.message, 'worker_error')
})

/**
 * 未捕获的 Promise 错误
 */
self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  handleError(event.reason, 'unhandled_rejection')
})

console.log('[Worker] Plugin runtime initialized')
