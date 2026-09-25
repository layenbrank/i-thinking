import { HttpEnvelope } from '@/utils/http.errors.ts'
import { http } from '@/utils/http.ts'

/**
 * 租户与订阅（service `/api/v1/tenants/*`）。
 *
 * 与 `apis/gateway.ts` 分开：那边是「模型目录、配额、档位目录」，这里是「我属于谁、我给哪个
 * 租户开了订阅」。两者的鉴权与错误码也不同（这里会回「非租户成员」，网关回的是配额不足）。
 *
 * 配额与「今日已用」都在网关侧：`GET /gateway/quota/me`（见 `apis/gateway.ts`）由服务端按
 * Redis 日窗计数直接回答，客户端不再翻页汇总用量明细 —— 那份明细是管理员接口，普通账号本来
 * 就读不到。本文件只负责租户归属与订阅这两件租户面的事。
 *
 * 关键约定（服务端 `subscription/quota`）：档位只对**个人租户**生效，有效订阅 > 免费档；
 * 团队租户与无租户身份走全局兜底配额。
 */

/** 租户类型；只有个人租户能订阅档位 */
const PERSONAL_TENANT = 'PERSONAL'

interface Tenant {
  id: string
  name: string
  slug: string
  status: string
  type: string
  createdAt: number
  updatedAt: number
}

interface TenantSubscription {
  id: string
  tenantID: string
  plan: string
  status: string
  /** 毫秒时间戳；null = 永久有效 */
  expiresAt: number | null
  createdAt: number
  updatedAt: number
}

interface SubscribeInput {
  plan: string
  /** 缺省 = 永久有效 */
  expiresAt?: number | null
}

async function unwrap<T>(pending: Promise<RSF<T>>): Promise<T> {
  return HttpEnvelope(await pending)
}

/** 我所属的租户：注册时会自动建个人租户，所以正常情况下至少一条 */
function GET_MY_TENANTS(signal?: AbortSignal) {
  return unwrap(http.get<RSF<Tenant[]>>('/tenants', { signal }))
}

function GET_TENANT_SUBSCRIPTIONS(tenantID: string, signal?: AbortSignal) {
  return unwrap(
    http.get<RSF<TenantSubscription[]>>(`/tenants/${tenantID}/subscriptions`, { signal })
  )
}

/** 开通 / 续订：创建即生效，旧的有效订阅会被服务端作废 */
function CREATE_TENANT_SUBSCRIPTION(tenantID: string, input: SubscribeInput) {
  return unwrap(http.post<RSF<TenantSubscription>>(`/tenants/${tenantID}/subscriptions`, input))
}

function DELETE_TENANT_SUBSCRIPTION(tenantID: string, subscriptionID: string) {
  return unwrap(http.delete<RSF<null>>(`/tenants/${tenantID}/subscriptions/${subscriptionID}`))
}

export {
  CREATE_TENANT_SUBSCRIPTION,
  DELETE_TENANT_SUBSCRIPTION,
  GET_MY_TENANTS,
  GET_TENANT_SUBSCRIPTIONS,
  PERSONAL_TENANT
}
export type { SubscribeInput, Tenant, TenantSubscription }
