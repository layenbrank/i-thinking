import { HttpEnvelope } from '@/utils/http.errors.ts'
import { http } from '@/utils/http.ts'

/**
 * AI 网关（service `/api/v1/gateway/*`）：模型目录、对话补全、我的配额，以及后台管理面。
 *
 * 目录走 `http` 客户端（自动带登录令牌、拆信封）；补全不由渲染进程发 ——
 * 组织模型与我的模型走同一条主进程运行链路（见 `features/chat/platform.ts` 的说明）。
 *
 * 组织模型与配额都按请求头 `X-Tenant-ID` 归属（`utils/http.ts` 统一注入）：团队共享的模型只有
 * 带上所属租户才看得见，配额也记在该租户上。
 *
 * 管理面（供应商 / 模型 / 用量 / 审计）由服务端按 ADMIN 角色鉴权：非管理员会拿到
 * 300006 权限不足，所以设置页里只对管理员显示。
 */

/** 网关能路由的供应商类型（与 `service` 的 `chat_url` 放行列表一致） */
const GATEWAY_PROVIDER_KINDS = ['openai', 'deepseek', 'qwen', 'zhipu', 'ollama'] as const

const GATEWAY_PROVIDER_KIND_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  qwen: '通义千问',
  zhipu: '智谱',
  ollama: 'Ollama'
}

const GATEWAY_PROVIDER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '启用',
  DISABLED: '停用'
}

/** 目录条目：`name` 是请求 `model` 字段要用的值，`label` 是给人看的名字 */
interface GatewayModel {
  id: string
  providerID: string
  name: string
  label: string
  allowRoles: string[] | null
  enabled: boolean
  dailyTokenQuota: number
  /**
   * 模型能力声明（服务端可选下发）。缺省时客户端按「工具可用、推理/视觉未知」处理；
   * 网关是透传端点，能力只有服务端（模型目录的管理者）知道。
   */
  capabilities?: { tools?: boolean; reasoning?: boolean; vision?: boolean }
  /** 上下文窗口（token），可选 */
  contextWindow?: number
  /**
   * 上游供应商展示名（服务端下发）。用户面目录也带这个字段，因为普通用户读不到
   * `/gateway/providers`，无法自己把 `providerID` 解析成名字。
   */
  providerName?: string
  createdAt: number
  updatedAt: number
}

interface GatewayProvider {
  id: string
  kind: string
  name: string
  baseUrl: string
  status: string
  /** 服务端只回「是否已托管密钥」，不回传明文/密文 */
  hasApiKey: boolean
  createdAt: number
  updatedAt: number
}

interface GatewayProviderInput {
  kind: string
  name: string
  baseUrl: string
  /** 明文密钥，服务端入库前加密；更新时留空表示不改 */
  apiKey?: string
  status?: string
}

type GatewayProviderPatch = Partial<GatewayProviderInput>

interface GatewayModelInput {
  providerID: string
  name: string
  label: string
  /** 允许调用的角色；留空 = 全角色放行 */
  allowRoles?: string[] | null
  enabled?: boolean
  /** 日 token 配额；0 = 继承租户 */
  dailyTokenQuota?: number
  /** 能力声明；缺项按客户端兜底处理 */
  capabilities?: { tools?: boolean; reasoning?: boolean; vision?: boolean }
  /** 上下文窗口（token） */
  contextWindow?: number
}

/** 模型更新不支持改挂供应商（服务端 `ModelUpdateP` 没有 providerID） */
type GatewayModelPatch = Partial<Omit<GatewayModelInput, 'providerID'>>

interface GatewayUsage {
  id: string
  tenantID: string | null
  userID: string
  modelID: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  status: string
  latencyMs: number
  createdAt: number
}

interface GatewayUsageQuery {
  tenantID?: string
  modelID?: string
  /** 毫秒时间戳，闭区间 */
  from?: number
  to?: number
  page?: number
  size?: number
}

interface GatewayAudit {
  id: string
  tenantID: string | null
  actor: string
  action: string
  resource: string
  detail: unknown
  ip: string | null
  createdAt: number
}

interface GatewayAuditQuery {
  tenantID?: string
  page?: number
  size?: number
}

/** 计费范围：有租户身份记租户头上，没有就记账号头上 */
type GatewayQuotaScope = 'TENANT' | 'USER' | string

/** 上限来源：单模型覆盖 / 订阅档位 / 免费档 / 全局兜底 */
type GatewayQuotaSource = 'MODEL' | 'PLAN' | 'FREE' | 'GLOBAL' | string

/**
 * 「我此刻的日窗配额」只读镜像。
 *
 * 服务端算的不只是上限，还有**今日已用**（Redis 日窗计数）与是否已触顶：这些数字散在
 * 租户档位、模型覆盖、身份归属三处，客户端自己拼不出准值，所以一律以服务端回答为准。
 */
interface GatewaySelfQuota {
  /** 归属：`TENANT` / `USER` */
  scope: GatewayQuotaScope
  /** 归属主体 id：租户 id 或用户 id */
  scopeID: string
  /** 归属租户；没有租户身份时不发 */
  tenantID?: string
  /** 租户类型：`PERSONAL` / `TEAM`；没有租户身份时不发 */
  tenantType?: string
  source: GatewayQuotaSource
  /** 档位名；只有 `PLAN` 有 */
  plan?: string
  /** 日配额上限（token） */
  limit: number
  /** 今日已用（token） */
  used: number
  /** 剩余（服务端已钳到不小于 0） */
  remaining: number
  /** 是否已触顶；触顶后平台模型的新请求会被服务端拒绝（400006） */
  exhausted: boolean
  /** 日窗重置时刻（毫秒时间戳，UTC 零点） */
  resetsAt: number
}

interface GatewaySelfQuotaQuery {
  /** 目录里的模型名；缺省或 `auto` 时按身份级配额回答 */
  model?: string
}

/** 可开通档位：配额数字来自服务端配置 `gateway.plan_daily_token_quota` */
interface GatewayPlan {
  plan: string
  dailyTokenQuota: number
}

interface GatewayPlans {
  plans: GatewayPlan[]
  /** 免费档基线（没订阅时的上限） */
  freeDailyTokenQuota: number
}

/** 服务端分页信封：`count` 是总条数，`total` 是总页数 */
interface GatewayPaginated<T> {
  items: T[]
  count: number
  page: number
  size: number
  total: number
  next: boolean
  prev: boolean
}

async function unwrap<T>(pending: Promise<RSF<T>>): Promise<T> {
  return HttpEnvelope(await pending)
}

/** 当前用户可见的模型（服务端已按启用状态与角色过滤） */
function GET_GATEWAY_MODELS(signal?: AbortSignal) {
  return unwrap(http.get<RSF<GatewayModel[]>>('/gateway/models', { signal }))
}

/** 全部供应商（含停用、含未托管密钥的） */
function GET_GATEWAY_PROVIDERS(signal?: AbortSignal) {
  return unwrap(http.get<RSF<GatewayProvider[]>>('/gateway/providers', { signal }))
}

function CREATE_GATEWAY_PROVIDER(input: GatewayProviderInput) {
  return unwrap(http.post<RSF<GatewayProvider>>('/gateway/providers', input))
}

function UPDATE_GATEWAY_PROVIDER(id: string, patch: GatewayProviderPatch) {
  return unwrap(http.put<RSF<GatewayProvider>>(`/gateway/providers/${id}`, patch))
}

function DELETE_GATEWAY_PROVIDER(id: string) {
  return unwrap(http.delete<RSF<null>>(`/gateway/providers/${id}`))
}

/** 管理面模型列表：不过滤启用状态与角色，与用户面目录不同 */
function GET_GATEWAY_ADMIN_MODELS(signal?: AbortSignal) {
  return unwrap(http.get<RSF<GatewayModel[]>>('/gateway/admin/models', { signal }))
}

function CREATE_GATEWAY_MODEL(input: GatewayModelInput) {
  return unwrap(http.post<RSF<GatewayModel>>('/gateway/admin/models', input))
}

function UPDATE_GATEWAY_MODEL(id: string, patch: GatewayModelPatch) {
  return unwrap(http.put<RSF<GatewayModel>>(`/gateway/admin/models/${id}`, patch))
}

function DELETE_GATEWAY_MODEL(id: string) {
  return unwrap(http.delete<RSF<null>>(`/gateway/admin/models/${id}`))
}

function GET_GATEWAY_USAGE(query: GatewayUsageQuery = {}, signal?: AbortSignal) {
  return unwrap(http.get<RSF<GatewayPaginated<GatewayUsage>>>('/gateway/usage', { query, signal }))
}

function GET_GATEWAY_AUDIT(query: GatewayAuditQuery = {}, signal?: AbortSignal) {
  return unwrap(http.get<RSF<GatewayPaginated<GatewayAudit>>>('/gateway/audit', { query, signal }))
}

/**
 * 我此刻的日窗配额（登录即可读，不需要管理员）。
 *
 * 只读：不消耗额度、不改计数。带 `model` 时按该模型的覆盖值回答，正是发送前判定要用的口径。
 */
function GET_GATEWAY_QUOTA_ME(query: GatewaySelfQuotaQuery = {}, signal?: AbortSignal) {
  return unwrap(http.get<RSF<GatewaySelfQuota>>('/gateway/quota/me', { query, signal }))
}

/** 可开通档位目录 + 免费档基线：设定里的档位卡由此渲染，不再手填档位名 */
function GET_GATEWAY_PLANS(signal?: AbortSignal) {
  return unwrap(http.get<RSF<GatewayPlans>>('/gateway/plans', { signal }))
}

export {
  CREATE_GATEWAY_MODEL,
  CREATE_GATEWAY_PROVIDER,
  DELETE_GATEWAY_MODEL,
  DELETE_GATEWAY_PROVIDER,
  GATEWAY_PROVIDER_KIND_LABELS,
  GATEWAY_PROVIDER_KINDS,
  GATEWAY_PROVIDER_STATUS_LABELS,
  GET_GATEWAY_ADMIN_MODELS,
  GET_GATEWAY_AUDIT,
  GET_GATEWAY_MODELS,
  GET_GATEWAY_PLANS,
  GET_GATEWAY_PROVIDERS,
  GET_GATEWAY_QUOTA_ME,
  GET_GATEWAY_USAGE,
  UPDATE_GATEWAY_MODEL,
  UPDATE_GATEWAY_PROVIDER
}
export type {
  GatewayAudit,
  GatewayAuditQuery,
  GatewayModel,
  GatewayModelInput,
  GatewayModelPatch,
  GatewayPaginated,
  GatewayPlan,
  GatewayPlans,
  GatewayProvider,
  GatewayProviderInput,
  GatewayProviderPatch,
  GatewayQuotaScope,
  GatewayQuotaSource,
  GatewaySelfQuota,
  GatewaySelfQuotaQuery,
  GatewayUsage,
  GatewayUsageQuery
}
