import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import {
  GET_GATEWAY_PLANS,
  GET_GATEWAY_QUOTA_ME,
  type GatewayPlans,
  type GatewaySelfQuota
} from '@/apis/gateway.ts'
import {
  CREATE_TENANT_SUBSCRIPTION,
  DELETE_TENANT_SUBSCRIPTION,
  GET_MY_TENANTS,
  GET_TENANT_SUBSCRIPTIONS,
  type SubscribeInput,
  type Tenant,
  type TenantSubscription
} from '@/apis/quota.ts'

import { clearQuotaCheck } from './gate.ts'
import { findPersonalTenant } from './tenant.ts'

/**
 * 「额度」界面用的查询与变更。
 *
 * 与 `gate.ts` 分工：那边是发送前的判定（不依赖 React，主进程链路要用），这边只是给界面用的
 * react-query 包装。两边读同一批接口，键统一挂 `['quota', …]` 前缀，订阅一改就一起失效。
 *
 * 配额读服务端的只读镜像（`GET /gateway/quota/me`）：**不要求有个人租户** —— 没有租户身份
 * 就是账号级配额，界面照样得显示还剩多少。订阅只对个人租户开放，所以单独看 `useActiveTenant`。
 */

const QUOTA_KEY = 'quota'

function useMyTenants() {
  return useQuery({
    queryKey: [QUOTA_KEY, 'tenants'],
    queryFn: function () {
      return GET_MY_TENANTS()
    }
  })
}

interface ActiveTenant {
  tenant: Tenant | null
  isLoading: boolean
  /** 接口层面失败（未登录 / 网络不通）；「没有个人租户」不算失败，`tenant` 为 null */
  isError: boolean
}

function useActiveTenant(): ActiveTenant {
  const query = useMyTenants()
  return {
    tenant: findPersonalTenant(query.data ?? []),
    isLoading: query.isLoading,
    isError: query.isError
  }
}

/**
 * 我此刻的配额（含今日已用与是否触顶）。
 *
 * `modelID` 给定时按该模型的覆盖上限回答 —— 与发送前判定同一口径，界面因此能显示
 * 「这个模型还能用多少」。默认按身份级配额（档位 / 免费档 / 全局兜底）。
 *
 * `enabled=false` 给「未登录也能出现的入口」用（左栏底栏的额度按钮）：没令牌时这个接口只会回
 * 401，问一次既浪费一次往返，界面也没有可展示的数字。
 */
function useSelfQuota(modelID: string | null = null, enabled = true) {
  return useQuery<GatewaySelfQuota>({
    queryKey: [QUOTA_KEY, 'self', modelID],
    enabled,
    queryFn: function () {
      return GET_GATEWAY_QUOTA_ME(modelID ? { model: modelID } : {})
    }
  })
}

/** 可开通档位目录（服务端配置的档位名与配额 + 免费档基线） */
function useGatewayPlans() {
  return useQuery<GatewayPlans>({
    queryKey: [QUOTA_KEY, 'plans'],
    queryFn: function () {
      return GET_GATEWAY_PLANS()
    }
  })
}

function useTenantSubscriptions(tenantID: string | null) {
  return useQuery<TenantSubscription[]>({
    queryKey: [QUOTA_KEY, 'subscriptions', tenantID],
    enabled: Boolean(tenantID),
    queryFn: function () {
      if (!tenantID) throw new Error('[quota] 缺少租户')
      return GET_TENANT_SUBSCRIPTIONS(tenantID)
    }
  })
}

/** 开着订阅之后，发送链路那份判定立刻作废，不然一分钟后才承认档位变了 */
function useInvalidateQuota() {
  const queryClient = useQueryClient()
  // 收银台那边把这个函数放进 `useEffect` 依赖：身份必须稳定，否则每渲染一次就重新取一遍额度
  return useCallback(
    async function () {
      clearQuotaCheck()
      await queryClient.invalidateQueries({ queryKey: [QUOTA_KEY] })
    },
    [queryClient]
  )
}

function useSubscribe(tenantID: string | null) {
  const invalidate = useInvalidateQuota()

  return useMutation({
    mutationFn: function (input: SubscribeInput) {
      if (!tenantID) throw new Error('[quota] 没有可订阅的租户')
      return CREATE_TENANT_SUBSCRIPTION(tenantID, input)
    },
    onSuccess: invalidate
  })
}

function useCancelSubscription(tenantID: string | null) {
  const invalidate = useInvalidateQuota()

  return useMutation({
    mutationFn: function (subscriptionID: string) {
      if (!tenantID) throw new Error('[quota] 没有可取消的租户')
      return DELETE_TENANT_SUBSCRIPTION(tenantID, subscriptionID)
    },
    onSuccess: invalidate
  })
}

export {
  QUOTA_KEY,
  useActiveTenant,
  useCancelSubscription,
  useGatewayPlans,
  useInvalidateQuota,
  useMyTenants,
  useSelfQuota,
  useSubscribe,
  useTenantSubscriptions
}
export type { ActiveTenant }
