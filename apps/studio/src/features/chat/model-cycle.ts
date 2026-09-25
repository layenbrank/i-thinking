import { findProviders } from '@/features/chat/provider/query.ts'
import { collectProviderModels } from '@/features/chat/provider/row.ts'
import { useAgentStore } from '@/stores/agent.ts'

/**
 * 循环切换模型（输入区快捷键 `Ctrl / ⌘ + /`）。
 *
 * 顺序与 picker 完全一致：**组织模型在前，我的模型在后** —— 两边都从同一份
 * provider 清单派生，所以不会出现「菜单里看到的」与「切到的」不是一个集合。
 *
 * 只读一遍清单（`findProviders` 就是 picker 用的那个 queryFn，命中同一份缓存口径），
 * 落库仍走设置存储的 `chat.providerID` / `chat.model`，与手动选中是同一个入口。
 */

/** 展平成一维候选：`[{ providerID, model }]`，顺序即 picker 顺序 */
async function findModelOrder(): Promise<{ providerID: string; model: string }[]> {
  const providers = await findProviders()

  return providers
    .filter(function (provider) {
      return provider.enabled
    })
    .flatMap(function (provider) {
      return collectProviderModels(provider).map(function (item) {
        return { providerID: provider.id, model: item.id }
      })
    })
}

async function cycleModel(step: 1 | -1): Promise<void> {
  const order = await findModelOrder()
  if (order.length === 0) return

  const { providerID, model } = useAgentStore.getState().settings.chat
  const current = order.findIndex(function (item) {
    return item.providerID === providerID && item.model === model
  })

  // 没选中任何模型时从第一项开始，往后走就是「从头往下轮」
  const next = current < 0 ? 0 : (current + step + order.length) % order.length
  const target = order[next]

  await useAgentStore.getState().update('chat', {
    providerID: target.providerID,
    model: target.model
  })
}

export { cycleModel }
