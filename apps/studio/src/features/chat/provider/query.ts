import { useQuery } from '@tanstack/react-query'

import { dropStalePlatformRow, ensurePlatformProvider } from '@/features/chat/platform.ts'
import type { ProviderRow } from '@/features/chat/provider/row.ts'

/**
 * 「可用模型清单」的唯一读取口径：设置页、模型选择器、右侧栏都用它，键相同所以共用缓存。
 *
 * 顺序是**先库后网关**：本机 provider 一直在库里，平台网关那行是目录的镜像
 * （`ensurePlatformProvider` 按 id upsert，内容一致时一次读都不写）。
 * 网关不通或没登录时它返回 null，清单只剩本机模型 —— 不抛错，因为「没连上组织」
 * 本来就是正常状态；库里可能残留上一次登录的平台行，由 `dropStalePlatformRow` 滤掉。
 */

const PROVIDERS_KEY = ['chat', 'providers'] as const

async function findProviders(): Promise<ProviderRow[]> {
  const rows = dropStalePlatformRow(await itc.chat.provider.toRead())
  const platform = await ensurePlatformProvider()
  if (!platform) return rows

  const others = rows.filter(function (row) {
    return row.id !== platform.id
  })
  return [...others, platform]
}

function useProviders() {
  return useQuery({ queryKey: PROVIDERS_KEY, queryFn: findProviders })
}

export { findProviders, PROVIDERS_KEY, useProviders }
