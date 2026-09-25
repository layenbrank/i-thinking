import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { toast } from 'sonner'

import { GET_AUTH_PROFILE, POST_AUTH_SIGNOUT } from '@/apis/auth.ts'
import type { AuthProfile } from '@/apis/auth.ts'
import { PROVIDERS_KEY } from '@/features/chat/provider/query.ts'
import { findAccountIdentity } from '@/features/account/identity.ts'
import type { AccountIdentity } from '@/features/account/identity.ts'
import { clearQuotaCheck } from '@/features/quota/gate.ts'
import { QUOTA_KEY } from '@/features/quota/usage.ts'
import {
  ADMIN_ROLE,
  clearAuthToken,
  clearAuthTokenIfCurrent,
  findAuthToken,
  isSessionInvalid,
  parseAuthClaims,
  parseAuthRole,
  subscribeAuthToken
} from '@/utils/auth.ts'

/**
 * 账号会话：令牌 → 资料 → 展示身份，一处对外。
 *
 * 为什么要有这一层：以前登录只写了令牌，界面各读各的 `localStorage`，于是登录之后
 * 左栏还是「本地」、设置页还是游客视角 —— 令牌是登录态的唯一真相，读写它的都应该
 * 从同一处订阅（`useAuthToken`），而不是各写各的假状态。
 *
 * 令牌失效（服务端 300001/300002/300003）主动清掉本地令牌：继续留着只会让每个接口都失败，
 * 界面还显示「已登录」。网络不通则**保留**令牌，只是资料暂时读不到。
 * 清的时候认令牌归属：只清发起这次请求的那一枚，用户在同一次请求期间重新登录不算数。
 */

const ACCOUNT_KEY = ['account'] as const

/** 资料不是高频变化的东西，5 分钟内不重复拉 */
const PROFILE_STALE_MS = 5 * 60_000

interface AccountSession {
  token: string | null
  profile: AuthProfile | null
  identity: AccountIdentity | null
  /** 有令牌、资料还没到手（首屏骨架用） */
  isLoading: boolean
  /** 有令牌但资料读不到（网关不通等）：不是未登录，别拿它去引导登录 */
  isProfileUnavailable: boolean
}

function readAuthProfile(): Promise<AuthProfile | null> {
  // 记下这次请求用的是哪一枚令牌：回来的 300001/300002/300003 只说明**那一枚**不行，
  // 而用户可能刚好在请求期间重新登录了 —— 不能拿陈旧响应把新令牌清掉
  const token = findAuthToken()

  return GET_AUTH_PROFILE().catch(function (error) {
    if (!isSessionInvalid(error)) throw error
    clearAuthTokenIfCurrent(token)
    return null
  })
}

/** 令牌的响应式读取：登录/登出后所有读它的组件同一帧刷新 */
function useAuthToken(): string | null {
  return useSyncExternalStore(subscribeAuthToken, findAuthToken, findAuthToken)
}

/** 平台角色是否管理员；跟着令牌刷新 —— 登录/登出后设置页的分组要立刻跟着变 */
function useIsAdmin(): boolean {
  return parseAuthRole(useAuthToken()) === ADMIN_ROLE
}

function useAccountSession(): AccountSession {
  const token = useAuthToken()
  const query = useQuery({
    queryKey: [...ACCOUNT_KEY, token],
    queryFn: readAuthProfile,
    enabled: Boolean(token),
    // 令牌刚被判失效过一次，重试只会再失败一次；状态由 `readAuthProfile` 负责收敛
    retry: false,
    staleTime: PROFILE_STALE_MS
  })

  const profile = query.data ?? null
  const claims = useMemo(
    function () {
      return parseAuthClaims(token)
    },
    [token]
  )
  const identity = useMemo(
    function () {
      return findAccountIdentity(profile, claims)
    },
    [claims, profile]
  )

  return {
    token,
    profile,
    identity,
    isLoading: Boolean(token) && query.isPending,
    isProfileUnavailable: Boolean(token) && query.isError
  }
}

/**
 * 登录态变化后要作废的缓存。
 *
 * 这些都按「谁在登录」作答：资料、配额、可用模型清单（平台那行只在登录后才有）。
 * 不刷新的话，切换账号会继续读上一个账号的额度与目录。
 *
 * 失效由 `useAuthCacheSync` 统一触发，登录表单与登出不再各调一次：那些组件会在跳转时
 * 立刻卸载，失效就可能被跳过；而令牌才是登录态的唯一真相，谁写的都该走同一条路。
 */
function refreshAfterAuthChange(queryClient: QueryClient): void {
  clearQuotaCheck()
  void queryClient.invalidateQueries({ queryKey: ACCOUNT_KEY })
  void queryClient.invalidateQueries({ queryKey: [QUOTA_KEY] })
  void queryClient.invalidateQueries({ queryKey: PROVIDERS_KEY })
}

/**
 * 令牌一变就作废上面那些缓存 —— 含**别的窗口**登录/登出：令牌在同一份 localStorage 里，
 * 变化靠 `storage` 事件传过来（见 `utils/auth.ts`），不跟这一步的话，agent 窗口会继续用
 * 未登录时那份「没有组织模型、额度为 0」的读数。
 *
 * 挂在根 Provider（`components/provider/query.tsx`）上，而不是挂在按钮的回调里：
 * 每个窗口都有一份自己的 query client，而根 Provider 是每个窗口都会挂且有客户端的地方。
 */
function useAuthCacheSync(queryClient: QueryClient): void {
  const token = useAuthToken()
  const previousToken = useRef(token)

  useEffect(
    function () {
      if (previousToken.current === token) return
      previousToken.current = token
      refreshAfterAuthChange(queryClient)
    },
    [queryClient, token]
  )
}

function useSignOut(): { signOut: () => void; isPending: boolean } {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async function () {
      try {
        await POST_AUTH_SIGNOUT()
      } catch (error) {
        // 服务端没能记上黑名单（网关不通等）不该把用户困在登录态里：本地照样退出
        console.warn('[account] 服务端登出失败，仅清理本地令牌', error)
      }
    },
    onSuccess: function () {
      clearAuthToken()
      toast.success('已退出登录')
    }
  })

  return { signOut: mutation.mutate, isPending: mutation.isPending }
}

export { useAccountSession, useAuthCacheSync, useAuthToken, useIsAdmin, useSignOut }
export type { AccountSession }
