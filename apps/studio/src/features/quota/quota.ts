import type { GatewaySelfQuota } from '@/apis/gateway.ts'

/**
 * 配额的展示换算：设置页的卡片与发送前的拦截共用同一份服务端数字，避免「界面说还能用、实际发不出去」。
 *
 * 上限、今日已用、是否触顶**都不是客户端算的**：归属（租户 / 账号）、模型覆盖、档位、Redis 日窗
 * 计数都在服务端汇成一条 `GET /gateway/quota/me`（判定口径见 `services/gateway/quota.rs`：
 * 触顶即 `used >= limit`，计数器按 UTC 日窗滚动）。客户端只把它排版出来。
 */

const QUOTA_SOURCE_LABELS: Record<string, string> = {
  MODEL: '模型覆盖',
  PLAN: '订阅档位',
  FREE: '免费档',
  GLOBAL: '全局配额'
}

/** 计费范围：有租户身份记租户头上，没有就记账号头上 */
const QUOTA_SCOPE_LABELS: Record<string, string> = {
  TENANT: '租户',
  USER: '账号'
}

function findQuotaSourceLabel(source: string): string {
  return QUOTA_SOURCE_LABELS[source] ?? source
}

function findQuotaScopeLabel(scope: string): string {
  return QUOTA_SCOPE_LABELS[scope] ?? scope
}

function findPercent(used: number, limit: number): number {
  if (limit <= 0) return 100
  return Math.min(100, Math.round((used / limit) * 100))
}

interface QuotaView {
  limit: number
  used: number
  /** 服务端已钳到不小于 0 */
  remaining: number
  /** 0..100，进度条宽度 */
  percent: number
  exhausted: boolean
  sourceLabel: string
  scopeLabel: string
  plan: string | null
  /** 日窗重置时刻（毫秒时间戳） */
  resetsAt: number
  /** 上限来自单个模型的覆盖值，而不是档位 */
  fromModel: boolean
}

function toQuotaView(quota: GatewaySelfQuota | null | undefined): QuotaView | null {
  if (!quota) return null

  return {
    limit: quota.limit,
    used: quota.used,
    remaining: quota.remaining,
    percent: findPercent(quota.used, quota.limit),
    exhausted: quota.exhausted,
    sourceLabel: findQuotaSourceLabel(quota.source),
    scopeLabel: findQuotaScopeLabel(quota.scope),
    plan: quota.plan ?? null,
    resetsAt: quota.resetsAt,
    fromModel: quota.source === 'MODEL'
  }
}

/** token 数量给人看：档位动辄百万位，原样打印读不出量级 */
function formatTokens(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 100_000_000) return `${(value / 100_000_000).toFixed(1)} 亿`
  if (abs >= 10_000) return `${(value / 10_000).toFixed(1)} 万`
  return String(value)
}

export {
  findQuotaScopeLabel,
  findQuotaSourceLabel,
  formatTokens,
  QUOTA_SCOPE_LABELS,
  QUOTA_SOURCE_LABELS,
  toQuotaView
}
export type { QuotaView }
