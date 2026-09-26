/**
 * 能力 crate 的机器可读声明：数据所有权、依赖方向、公开模块、要吸收的遗留目录。
 *
 * 这是「能力边界」的唯一事实来源，由 scripts/arch.ts 强制；README.md 负责给人读。
 * 改这里等于改架构：新增能力 = 新增一条声明 + 一个 crates/<name> 目录 + 一份 README。
 */

export type CapabilityStatus =
  /** 边界与实现都已迁入，遗留目录必须已删除 */
  | 'migrated'
  /** 边界已建立，实现正在逐块迁入 */
  | 'migrating'
  /** 仅声明边界，实现尚未开始 */
  | 'pending'

export interface Capability {
  /** crate 名，与目录名 crates/<name> 一致 */
  name: string
  /** 中文标题（用于输出） */
  title: string
  /** 拥有的数据库表；同一张表只能被一个能力声明 */
  owns: readonly string[]
  /** 允许依赖的其他能力 crate（除 entity/migration 等非能力 crate 外，其余能力依赖一律禁止） */
  dependsOn: readonly string[]
  /** 允许对外的 pub mod（能力 crate 默认只暴露 crate 根部的项） */
  publicModules: readonly string[]
  /** 迁入完成后必须消失的遗留路径（相对 apps/core） */
  absorbs: readonly string[]
  status: CapabilityStatus
}

export const CAPABILITIES: readonly Capability[] = [
  {
    name: 'identity',
    title: '身份与租户',
    owns: ['auth', 'tenant', 'tenant_member', 'sso_connection'],
    dependsOn: [],
    publicModules: ['account', 'persistence', 'tenant'],
    absorbs: ['src/services/auth', 'src/services/user', 'src/services/tenant', 'src/services/sso'],
    status: 'migrating'
  },
  {
    name: 'authz',
    title: '授权决策',
    owns: [],
    dependsOn: ['identity'],
    publicModules: [],
    absorbs: [],
    status: 'migrating'
  },
  {
    name: 'billing',
    title: '订阅与计费',
    owns: ['subscription', 'payment_order'],
    dependsOn: ['identity'],
    publicModules: [],
    absorbs: ['src/services/subscription', 'src/services/payment'],
    status: 'pending'
  },
  {
    name: 'gateway',
    title: '模型网关',
    owns: ['gateway_provider', 'gateway_model', 'gateway_usage', 'gateway_audit'],
    dependsOn: ['identity'],
    publicModules: [],
    absorbs: ['src/services/gateway'],
    status: 'pending'
  },
  {
    name: 'document',
    title: '文档与资产',
    owns: ['asset', 'chunk'],
    dependsOn: ['identity'],
    publicModules: [],
    absorbs: ['src/services/upload', 'src/services/markdown', 'src/services/search'],
    status: 'pending'
  },
  {
    name: 'audit',
    title: '事件与审计',
    owns: ['outbox', 'consumed_event'],
    dependsOn: ['identity'],
    publicModules: [],
    absorbs: [],
    status: 'pending'
  },
  {
    name: 'notify',
    title: '出站通知',
    owns: [],
    dependsOn: ['identity'],
    publicModules: [],
    absorbs: [],
    status: 'pending'
  }
]

/**
 * 遗留 src/services 模块的冻结集合：只减不增。
 *
 * 新能力一律建 crate（见 CAPABILITIES），不允许再往 src/services 里加模块。
 * `core` 标记的模块是应用层编排（对话/引擎/应用），归属 api 二进制，不会被能力 crate 吸收。
 */
export const LEGACY_SERVICES: Record<string, { owner: string; note: string }> = {
  application: { owner: 'core', note: '应用层编排，留在 api 二进制' },
  auth: { owner: 'identity', note: '账号与认证' },
  engine: { owner: 'core', note: '对话/智能体编排，留在 api 二进制' },
  gateway: { owner: 'gateway', note: '模型网关' },
  markdown: { owner: 'document', note: '文档解析' },
  payment: { owner: 'billing', note: '支付渠道' },
  search: { owner: 'document', note: '检索索引' },
  sso: { owner: 'identity', note: 'SSO 连接' },
  subscription: { owner: 'billing', note: '订阅与配额' },
  tenant: { owner: 'identity', note: '租户与成员' },
  upload: { owner: 'document', note: '资产上传' },
  user: { owner: 'identity', note: '账号资料' }
}

/** 能力 crate 不得依赖的 crate：api 二进制本身与 Web 框架 */
export const FORBIDDEN_CRATE_DEPS = [
  'service',
  'actix-web',
  'actix-cors',
  'actix-files',
  'actix-multipart',
  'axum',
  'rocket',
  'utoipa-swagger-ui'
] as const

/**
 * R3：角色词汇的出现模式。
 *
 * 目标状态下 `src/` 与能力 crate 里不再出现重复的角色词汇或散写的权限判断：遗留的
 * `Role::` / `Status::`（identity 的领域类型一律带命名空间前缀）、`.is_admin()` 谓词、
 * 与角色字面量的比较。引用 identity 的领域类型（如 `PlatformRole::User`）是允许的——
 * 词汇只定义在 `crates/identity`，判定只写在 `crates/authz`。
 */
export const ROLE_VOCAB_PATTERN =
  /\b(?:Role|Status)\s*::|\.is_admin\s*\(|(?:==|!=)\s*"(?:OWNER|ADMIN|MEMBER|USER)"/g

/**
 * R7 豁免名单：`src/guards/` 与 `src/databases/scope.rs` 之外的作用域入口，数量只能减少。
 *
 * 目标状态下进入作用域只有两条路：请求侧由守卫按请求上下文开（`TenantCtx::enter/open_new`、
 * `AccountScope::enter`、`AssetReader::enter`），机器侧是显式能力键引导且调用点登记在这里。
 * 任何新增作用域入口都必须先想清楚归属，而不是就地打开事务。
 *
 * 名单名保留（历史原因），实际涵盖租户 / 账号 / 支付 / 资产四类作用域入口。
 */
export const TENANT_SCOPE_LEGACY: Record<string, { max: number; reason: string }> = {
  'src/services/subscription/service.rs': {
    max: 2,
    reason:
      '只读包装器（active_plan、active_subscription），待调用方携带作用域后移除；配额判定已在调用方作用域内完成'
  },
  'src/services/payment/service.rs': {
    max: 1,
    reason:
      '支付回调的引导调用点（PaymentNotifyScope::open 把订单号换成租户作用域）；守卫本身在 src/guards/payment.rs，这里只是调用'
  },
  'src/services/tenant/service.rs': {
    max: 2,
    reason: 'select_tenant 的 user_tx（选定租户前读成员表）与一处文档提及，待迁到 AccountScope 后移除'
  },
  'src/services/gateway/service.rs': {
    max: 2,
    reason:
      '用量/审计落库的机器路径：上游调用结束后按身份重开一段短作用域（租户面 TenantScope::open、账号面 AccountScope::open）'
  },
  'src/services/upload/service.rs': {
    max: 4,
    reason:
      '资产面请求路径：一次请求内分段开短作用域（秒传引导 AssetContentScope::open、账号 AccountScope::open、读资产 AssetReader::enter），长 CAS I/O 在事务外，不跨网络持有作用域'
  },
  'src/services/auth/service.rs': {
    max: 2,
    reason:
      '头像是档案数据：以头像所属账号的账号作用域读（load_avatar_of），绑定头像时在同一作用域内校验并提升为 PUBLIC（check_avatar）'
  },
  'src/services/user/service.rs': {
    max: 1,
    reason:
      '管理面用户列表：一批账号的头像共用一个匿名读事务（只读 PUBLIC 头像），不给每个账号单开作用域'
  },
  'src/services/sso/service.rs': {
    max: 2,
    reason:
      'OIDC 匿名流程的引导调用点（连接 id 读回连接行、再按该租户开写事务）；守卫本身在 src/guards/sso.rs，这里只是调用'
  }
}

/**
 * 作用域入口模式：直接开事务、自行设置会话变量，或接续已写好作用域的事务。
 *
 * `order_tx` / `apply_order_capability` / `TenantScope::adopt` / `PaymentNotifyScope::open`
 * 是**能力键引导**（支付回调：订单号 → 租户）用到的入口，只允许出现在 `src/guards/`。
 * `AssetReader::enter` / `AssetContentScope::open` / `asset_hash_tx` / `apply_asset_capability`
 * 是资产面的三条通道（账号 / 匿名 / 内容寻址能力键），同样只允许出现在 `src/guards/`；
 * `SsoConnectionScope::open` / `sso_connection_tx` / `apply_sso_capability` 是 SSO 匿名流程的
 * 连接 id 能力键通道，`SsoLoginScope::open` 是它引导出来的租户作用域，同样只允许出现在
 * `src/guards/`；`anon_tx`（无作用域）另受 R9 约束。
 */
export const TENANT_SCOPE_PATTERN =
  /\b(?:tenant_tx|user_tx|order_tx|asset_hash_tx|sso_connection_tx|anon_tx|apply_tenant_scope|apply_user_scope|apply_order_capability|apply_asset_capability|apply_sso_capability|TenantScope::open|TenantScope::adopt|AccountScope::open|PaymentNotifyScope::open|AssetReader::enter|AssetContentScope::open|SsoConnectionScope::open|SsoLoginScope::open)\b/g

/** R7 允许的作用域入口归属路径（定义与唯一入口） */
export const TENANT_SCOPE_OWNER_PATHS = ['src/guards/', 'src/databases/scope.rs'] as const

/**
 * 平台特权入口模式：直接开特权事务，或走守卫的唯一入口。
 *
 * 提权（`SET LOCAL ROLE core_platform`）绕过行级隔离，因此**只有**平台目录的全局行
 * （`"tenantID" IS NULL`）与跨租户运维汇总需要它；租户面与账号面一律走作用域。
 */
export const PLATFORM_ENTRY_PATTERN = /\b(?:platform_tx|PlatformScope::open)\b/g

/**
 * R8 名单：`src/guards/` 之外允许出现的平台特权入口，**正向登记**（不在名单内即违规）。
 *
 * 与 R7 的「只减不增豁免」不同：这里每多一个调用点都是一次显式决策，必须写明用途。
 */
export const PLATFORM_ENTRY_ALLOWED: Record<string, { max: number; reason: string }> = {
  'src/services/gateway/controller.rs': {
    max: 10,
    reason:
      '平台目录运维面（供应商/模型全局行、跨租户用量与审计汇总）：10 个 handler 各开一段特权作用域，业务逻辑在 service.rs 内按 scope.tx() 收口'
  },
  'src/services/sso/controller.rs': {
    max: 4,
    reason:
      'SSO 连接管理面（平台运维按平台管理员指定的租户建连接、跨租户列连接）：4 个 handler 各开一段特权作用域，业务逻辑在 service.rs 内按 scope.tx() 收口'
  }
}

/** R8 允许的定义与唯一入口归属路径 */
export const PLATFORM_ENTRY_OWNER_PATHS = ['src/guards/', 'src/databases/scope.rs'] as const

/**
 * R9：无作用域数据库访问模式。
 *
 * `Storage::anon_tx` 是唯一一条「什么身份都不带」的通道：行级策略只放行对匿名开放的行
 * （目前只有 `PUBLIC` 资产），写路径一律会被 `WITH CHECK` 挡回。它只允许出现在 `src/guards/`
 * 里，且每个出现都必须在这里登记用途——「读不到」应当是设计出来的，而不是忘了设作用域。
 *
 * 后续（P3e-3）会把 `Storage::db` 直连（不受行级策略约束的全局表）一并纳入本规则。
 */
export const UNSCOPED_DB_PATTERN = /\banon_tx\b/g

/** R9 允许的定义与唯一入口归属路径 */
export const UNSCOPED_DB_OWNER_PATHS = ['src/guards/', 'src/databases/scope.rs'] as const

/** R9 名单：`src/guards/` 之外允许出现的无作用域访问，**正向登记**（不在名单内即违规） */
export const UNSCOPED_DB_ALLOWED: Record<string, { max: number; reason: string }> = {}
