import type { PaymentCatalogChannel, PaymentCatalogPlan, PaymentOrder } from '@/apis/payment.ts'
import { PAYMENT_CHANNEL_LABELS, PAYMENT_ORDER_STATUS_LABELS } from '@/apis/payment.ts'
import { formatTokens } from '@/features/quota/quota.ts'

/**
 * 收银台的展示换算与轮询策略（纯函数，收银台与设置页共用）。
 *
 * 这里**不算钱**：金额、时长、可售性都是服务端 `pay.plans` 的原样快照，客户端只负责排版。
 * 唯一由客户端决定的是「多久问一次订单状态」—— 付款在手机上完成，桌面端只能轮询或主动查单。
 */

/** 待支付：扫码期间的状态 */
const ORDER_PENDING = 'PENDING'
/** 已支付：服务端已核销并开通订阅 */
const ORDER_PAID = 'PAID'
const ORDER_CLOSED = 'CLOSED'

const ORDER_POLL_INTERVAL_MS = 3000

const CURRENCY_SYMBOLS: Record<string, string> = { CNY: '¥' }

/** 分 → 人民币字符串。服务端一律以「分」为整数下发，避免浮点误差 */
function formatMoney(amountInCents: number, currency: string = 'CNY'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `
  return `${symbol}${(amountInCents / 100).toFixed(2)}`
}

/** 生效时长给人看；服务端用 null 表示永久 */
function formatDurationDays(durationDays: number | null): string {
  if (durationDays === null) return '永久有效'
  return `${durationDays} 天`
}

function findChannelLabel(code: string): string {
  return PAYMENT_CHANNEL_LABELS[code] ?? code
}

function findOrderStatusLabel(status: string): string {
  return PAYMENT_ORDER_STATUS_LABELS[status] ?? status
}

function findPlanLabel(plan: PaymentCatalogPlan | null | undefined): string {
  if (!plan) return '免费档'
  return plan.label ? `${plan.label}（${plan.plan}）` : plan.plan
}

/** 档位一行小字的说明：价格 + 配额 + 时长 */
function describePlan(plan: PaymentCatalogPlan): string {
  return `${formatMoney(plan.amount, plan.currency)} · ${formatTokens(plan.dailyTokenQuota)} tokens/天 · ${formatDurationDays(plan.durationDays)}`
}

function isOrderPending(order: PaymentOrder): boolean {
  return order.status === ORDER_PENDING
}

function isOrderPaid(order: PaymentOrder): boolean {
  return order.status === ORDER_PAID
}

function isOrderClosed(order: PaymentOrder): boolean {
  return order.status === ORDER_CLOSED
}

/**
 * 还要不要继续轮询。
 *
 * 只在「待支付且没过期」时轮询：过期后服务端会在下一次查单里惰性关单，继续问只是白耗请求；
 * 已支付或已关闭更没什么可变的了。轮询只是**加速** —— 真正的核销靠渠道回调与 `sync`，所以这里
 * 停掉不会漏单，用户还能手动点「刷新支付状态」。
 */
function shouldPollOrder(order: PaymentOrder | null | undefined, now: number): boolean {
  if (!order) return false
  if (!isOrderPending(order)) return false
  return now < order.orderExpiresAt
}

/** 二维码剩余有效期 `m:ss`；已过期返回空串（调用方据此换成「已过期」文案） */
function formatCountdown(expiresAt: number, now: number): string {
  const remain = expiresAt - now
  if (remain <= 0) return ''
  const total = Math.floor(remain / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** 能用（服务端配好凭据）的渠道优先，禁用的一律排在后面，`reason` 留给界面解释 */
function sortChannels(channels: PaymentCatalogChannel[]): PaymentCatalogChannel[] {
  return [...channels].sort(function (left, right) {
    if (left.enabled === right.enabled) return 0
    return left.enabled ? -1 : 1
  })
}

/** 默认选中的渠道：第一个可用的；一个都不可用就是 null（界面只展示原因，不给假按钮） */
function findDefaultChannel(channels: PaymentCatalogChannel[]): string | null {
  const item = sortChannels(channels).find(function (channel) {
    return channel.enabled
  })
  return item ? item.code : null
}

export {
  describePlan,
  findChannelLabel,
  findDefaultChannel,
  findOrderStatusLabel,
  findPlanLabel,
  formatCountdown,
  formatDurationDays,
  formatMoney,
  isOrderClosed,
  isOrderPaid,
  isOrderPending,
  ORDER_CLOSED,
  ORDER_PAID,
  ORDER_PENDING,
  ORDER_POLL_INTERVAL_MS,
  shouldPollOrder,
  sortChannels
}
