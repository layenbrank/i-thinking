/**
 * 当前活动会话指针。
 *
 * 为什么是模块级：它既不是渲染状态（不参与 UI 计算），也不属于某个 React 组件 ——
 * runtime 的 `onThreadIdChange` 写、历史适配器每次调用读。
 * 放在组件里用 ref 会被 react-hooks v6 的 refs/immutability 规则拦下
 * （传 ref 给函数 ≈ 渲染期读 ref；改传给 hook 的对象 ≈ 违规变更）。
 *
 * studio 同时只会挂一个 chat runtime（`/chat` 路由），因此单一指针足够。
 */

const ACTIVE = { id: null as string | null }

/** 历史适配器每次调用都取一次（切会话后必须读到新值） */
function findActiveThreadID(): string | null {
  return ACTIVE.id
}

function updateActiveThread(threadID: string | null): void {
  ACTIVE.id = threadID
}

export { findActiveThreadID, updateActiveThread }
