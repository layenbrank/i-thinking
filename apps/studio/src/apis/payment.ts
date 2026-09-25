import { HttpEnvelope } from '@/utils/http.errors.ts'
import { http } from '@/utils/http.ts'

/**
 * 支付下单与订单（service `/api/v1/tenants/{id}/pay/catalog`、`/tenants/{id}/orders*`）。
 *
 * 与 `apis/quota.ts` 分工：那边是「我属于谁、给谁开了订阅」，这里是「这笔钱怎么付出去」。两条
 * 链路在服务端才合流 —— **订阅记录由服务端收到渠道回调、验签并核对金额之后写入**，客户端从来
 * 不能自己「开通」。所以这里没有「下单即生效」的接口，只有四件事：读目录、下单、查单、关单。
 *
 * 安全约定（与 `services/payment` 一致，改这个文件前先读那边的模块注释）：
 * - 客户端只提交 `plan` + `channel`，**金额由服务端按 `pay.plans` 定价并快照落库**；
 * - `sync` 是回调丢失时的兜底，它同样要向上游查单，不是「客户端说付了就算付了」；
 * - `codeUrl` 是渠道下发的支付凭证（微信 `weixin://`、支付宝 `qr.alipay.com`），只用于本地渲染
 *   二维码，不要把它透出去或缓存到别处。
 */

/** 支付渠道。新增渠道时服务端 `pay.channels` 与这里要同时对得上 */
const PAYMENT_CHANNELS = ['WECHAT', 'ALIPAY'] as const
type PaymentChannel = (typeof PAYMENT_CHANNELS)[number]

const PAYMENT_CHANNEL_LABELS: Record<string, string> = {
  WECHAT: '微信支付',
  ALIPAY: '支付宝'
}

const PAYMENT_ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: '待支付',
  PAID: '已支付',
  CLOSED: '已关闭',
  REFUNDED: '已退款'
}

/** 可售档位：价格与时长都由服务端给，`purchasable=false` 时用 `reason` 说明为什么不能买 */
interface PaymentCatalogPlan {
  plan: string
  label: string
  /** 金额（**分**） */
  amount: number
  currency: string
  /** 生效时长（天）；null = 永久 */
  durationDays: number | null
  dailyTokenQuota: number
  purchasable: boolean
  reason?: string
}

interface PaymentCatalogChannel {
  code: string
  label: string
  /** 服务端没配好凭据时为 false（本机联调常见），此时界面置灰并显示 `reason` */
  enabled: boolean
  reason?: string
}

/** 价格 / 渠道目录：渲染「档位 → 渠道 → 下单」三步的唯一数据源 */
interface PaymentCatalog {
  currency: string
  /** 订单有效期（秒） */
  orderTtlSecs: number
  plans: PaymentCatalogPlan[]
  channels: PaymentCatalogChannel[]
  /** 当前生效档位；缺省 = 免费档 */
  currentPlan?: string
}

interface PaymentOrder {
  orderNo: string
  tenantID: string
  plan: string
  channel: string
  /** 金额（**分**） */
  amount: number
  currency: string
  status: string
  /** 渠道支付凭证，用来渲染二维码；异常情况下可能为 null，可调 `sync` 重新取 */
  codeUrl: string | null
  transactionId: string | null
  /** 开通后生效的订阅 ID，未开通为 null */
  subscriptionID: string | null
  dailyTokenQuota: number
  durationDays: number | null
  createdAt: number
  /** 支付截止时间（超过即自动关单） */
  orderExpiresAt: number
  paidAt: number | null
  remark: string | null
}

interface CreateOrderInput {
  plan: string
  channel: PaymentChannel
}

async function unwrap<T>(pending: Promise<RSF<T>>): Promise<T> {
  return HttpEnvelope(await pending)
}

function GET_PAYMENT_CATALOG(tenantID: string, signal?: AbortSignal) {
  return unwrap(http.get<RSF<PaymentCatalog>>(`/tenants/${tenantID}/pay/catalog`, { signal }))
}

/** 订单列表（服务端固定返回最近若干条，用于「订单历史」） */
function GET_TENANT_ORDERS(tenantID: string, signal?: AbortSignal) {
  return unwrap(http.get<RSF<PaymentOrder[]>>(`/tenants/${tenantID}/orders`, { signal }))
}

function GET_PAYMENT_ORDER(tenantID: string, orderNo: string, signal?: AbortSignal) {
  return unwrap(http.get<RSF<PaymentOrder>>(`/tenants/${tenantID}/orders/${orderNo}`, { signal }))
}

function CREATE_PAYMENT_ORDER(tenantID: string, input: CreateOrderInput) {
  return unwrap(http.post<RSF<PaymentOrder>>(`/tenants/${tenantID}/orders`, input))
}

/** 主动查单：回调丢失时的兜底，也是收银台「刷新支付状态」的实现 */
function SYNC_PAYMENT_ORDER(tenantID: string, orderNo: string) {
  return unwrap(http.post<RSF<PaymentOrder>>(`/tenants/${tenantID}/orders/${orderNo}/sync`))
}

function CLOSE_PAYMENT_ORDER(tenantID: string, orderNo: string) {
  return unwrap(http.post<RSF<PaymentOrder>>(`/tenants/${tenantID}/orders/${orderNo}/close`))
}

export {
  CLOSE_PAYMENT_ORDER,
  CREATE_PAYMENT_ORDER,
  GET_PAYMENT_CATALOG,
  GET_PAYMENT_ORDER,
  GET_TENANT_ORDERS,
  PAYMENT_CHANNELS,
  PAYMENT_CHANNEL_LABELS,
  PAYMENT_ORDER_STATUS_LABELS,
  SYNC_PAYMENT_ORDER
}
export type {
  CreateOrderInput,
  PaymentCatalog,
  PaymentCatalogChannel,
  PaymentCatalogPlan,
  PaymentChannel,
  PaymentOrder
}
