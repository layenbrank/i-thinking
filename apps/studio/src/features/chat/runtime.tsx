import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type AssistantRuntime,
  type ThreadHistoryAdapter
} from '@assistant-ui/react'
import { createChatModelAdapter } from '@i-thinking/chat/adapters/chat-model'
import { createThreadHistoryAdapter } from '@i-thinking/chat/adapters/thread-history'
import { createThreadListAdapter } from '@i-thinking/chat/adapters/thread-list'
import { useMemo, type ReactNode } from 'react'

import { findActiveThreadID, updateActiveThread } from '@/features/chat/port/active-thread.ts'
import { createGatewayModelPort } from '@/features/chat/port/gateway-model.ts'
import { createHistoryPort } from '@/features/chat/port/history.ts'
import {
  chatModelPort,
  findHostOptions,
  findModelSelection,
  findSystemPrompt
} from '@/features/chat/port/instance.ts'
import type { ChatTransportKind } from '@/features/chat/transport.ts'

/**
 * Chat runtime：会话列表自建（`useRemoteThreadListRuntime`），生成按通路二选一：
 * - 离线 → `useLocalRuntime` + 主进程 MessagePort（本地 / BYOK provider）
 * - 在线 → `useLocalRuntime` + gateway ChatModelPort（rust-service OpenAI SSE）
 *
 * 两条通路共用同一份历史适配器与 `ChatStreamEvent` 形状；在线不再走
 * `AssistantChatTransport`（那是旧 Nest UI message 流协议）。
 *
 * 切换通路会换掉 `runtimeHook`，因此 `views/agent` 用 `key={kind}` 强制重建。
 */

const historyPort = createHistoryPort()

const gatewayModelPort = createGatewayModelPort(function () {
  return { model: findModelSelection().model }
})

function useThreadHistory(): ThreadHistoryAdapter {
  return useMemo(function () {
    return createThreadHistoryAdapter(historyPort, findActiveThreadID)
  }, [])
}

/** 离线：主进程本地 provider（工具与审批也走同一条端口） */
function useOfflineThreadRuntime(): AssistantRuntime {
  const history = useThreadHistory()
  return useLocalRuntime(
    createChatModelAdapter(chatModelPort, {
      findHost: findHostOptions,
      findSystem: findSystemPrompt
    }),
    { adapters: { history } }
  )
}

/** 在线：rust-service gateway（纯文本 / 推理；无本地工具环） */
function useOnlineThreadRuntime(): AssistantRuntime {
  const history = useThreadHistory()
  return useLocalRuntime(
    createChatModelAdapter(gatewayModelPort, {
      findSystem: findSystemPrompt
    }),
    { adapters: { history } }
  )
}

const RUNTIME_HOOKS: Record<ChatTransportKind, () => AssistantRuntime> = {
  offline: useOfflineThreadRuntime,
  online: useOnlineThreadRuntime
}

function ChatRuntimeProvider(props: { kind: ChatTransportKind; children: ReactNode }) {
  const list = useMemo(function () {
    return createThreadListAdapter(historyPort)
  }, [])

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
