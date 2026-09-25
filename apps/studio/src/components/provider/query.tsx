import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

import { useAuthCacheSync } from '@/features/account/session.ts'
import { buildQueryClient } from '@/utils/query-client'

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider(props: QueryProviderProps) {
  const [client] = useState(buildQueryClient)

  // 每个窗口一份 query client，登录态只有一份（令牌在共享的 localStorage 里）：
  // 把「登录态变了」同步到本窗口的缓存，跨窗口登录/登出才不会留下上个账号的读数
  useAuthCacheSync(client)

  return <QueryClientProvider client={client}>{props.children}</QueryClientProvider>
}
