import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type AssistantRuntime,
  type ThreadHistoryAdapter
} from '@assistant-ui/react'
import { useChatRuntime } from '@assistant-ui/ai-sdk'
import { createChatModelAdapter } from '@i-thinking/chat/adapters/chat-model'
import { createThreadHistoryAdapter } from '@i-thinking/chat/adapters/thread-history'
import { createThreadListAdapter } from '@i-thinking/chat/adapters/thread-list'
import { useMemo, type ReactNode } from 'react'

import { findActiveThreadID, updateActiveThread } from '@/features/chat/port/active-thread.ts'
import { createHistoryPort } from '@/features/chat/port/history.ts'
import { createModelPort, type ModelSelection } from '@/features/chat/port/model.ts'
import {
  buildOnlineChatTransport,
  type ChatTransportKind
} from '@/features/chat/transport.ts'
import { useSettingsStore } from '@/stores/setting.ts'

/**
 * Chat runtime：会话列表自建（`useRemoteThreadListRuntime`），生成按通路二选一：
 * - 离线 → `useLocalRuntime` + `ChatModelPort`（主进程 provider，MessagePort 流式）
 * - 在线 → `useChatRuntime` + `AssistantChatTransport`（service 的 AI SDK 路由）
 *
 * 两种通路共用同一份历史适配器（同一张表、同一套会话列表）；在线 runtime 会自己
 * 调 `withFormat`，所以这里只传基础适配器。
 *
 * 活动会话 id 存在 `port/active-thread.ts`（模块级指针，不是 ref/state）：
 * 历史适配器每次调用都要读它，而写入发生在 runtime 回调里。
 *
 * 切换通路会换掉 `runtimeHook`（hook 顺序会变），因此 `views/chat` 用 `key={kind}` 强制重建。
 */

const historyPort = createHistoryPort()
// 模型选择每次运行时从设置现读：换 provider/模型后无需重建 runtime
function findModelSelection(): ModelSelection {
  const { chat } = useSettingsStore.getState().settings
  return { providerID: chat.providerID, model: chat.model }
}

const modelPort = createModelPort(findModelSelection)

function useThreadHistory(): ThreadHistoryAdapter {
  return useMemo(
    function () {
      return createThreadHistoryAdapter(historyPort, findActiveThreadID)
    },
    []
  )
}

/** 离线：主进程本地 provider */
function useOfflineThreadRuntime(): AssistantRuntime {
  const history = useThreadHistory()
  return useLocalRuntime(createChatModelAdapter(modelPort), { adapters: { history } })
}

/** 在线：service 的 `/chat`（UI message 流由传输层解析） */
function useOnlineThreadRuntime(): AssistantRuntime {
  const history = useThreadHistory()
  const transport = useMemo(function () {
    return buildOnlineChatTransport(function () {
      return findModelSelection().model
    })
  }, [])

  return useChatRuntime({ ...(transport ? { transport } : {}), adapters: { history } })
}

const RUNTIME_HOOKS: Record<ChatTransportKind, () => AssistantRuntime> = {
  offline: useOfflineThreadRuntime,
  online: useOnlineThreadRuntime
}

function ChatRuntimeProvider(props: { kind: ChatTransportKind; children: ReactNode }) {
  const list = useMemo(
    function () {
      return createThreadListAdapter(historyPort)
    },
    []
  )

  const runtime = useRemoteThreadListRuntime({
    adapter: list,
    runtimeHook: RUNTIME_HOOKS[props.kind],
    onThreadIdChange: function (threadID) {
      updateActiveThread(threadID ?? null)
    }
  })

  return <AssistantRuntimeProvider runtime={runtime}>{props.children}</AssistantRuntimeProvider>
}

export { ChatRuntimeProvider }
