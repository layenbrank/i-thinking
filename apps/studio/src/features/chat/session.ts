import { useAuiState } from '@assistant-ui/react'

/**
 * 当前线程**落库后**的会话 id。
 *
 * 不能直接用 `threads.mainThreadId`：那是线程映射 id，新建会话在 `initialize()` 之前是
 * `__LOCALID_x`，拿去查 diff / 账本必然落空（从侧栏重新打开的会话恰好两者相同，
 * 所以这个 bug 只在新会话里露头）。`remoteId` 就在线程条目上，随初始化一起出现。
 *
 * 选区只回 `item?.remoteId` 这个原始值：`useAuiState` 内部是裸的 `useSyncExternalStore`，
 * 按 `Object.is` 比对结果，回派生对象会让每帧都被判成「快照变了」。
 */
function useSessionID(): string | null {
  return useAuiState(function (state) {
    const main = state.threads.mainThreadId
    const item = state.threads.threadItems.find(function (entry) {
      return entry.id === main || entry.remoteId === main
    })
    return item?.remoteId ?? null
  })
}

/**
 * 当前线程的**稳定标识**：从新建那一刻起就是同一个值（新会话是 `__LOCALID_x`，
 * 服务端拉回来的会话恰好等于 remoteId），`initialize()` 只会补上 `remoteId`，不改它。
 *
 * 用途仅限「跨会话区分同一份界面状态」——右栏这类不随切换会话重挂载的组件用它做键，
 * 免得把 A 会话的读数显示到 B 会话上。要查库/查接口请用 `useSessionID`（remoteId）。
 */
function useThreadKey(): string | null {
  return useAuiState(function (state) {
    return state.threads.mainThreadId ?? null
  })
}

export { useSessionID, useThreadKey }
