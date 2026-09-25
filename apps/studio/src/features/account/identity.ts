import type { AuthProfile } from '@/apis/auth.ts'
import type { AuthClaims } from '@/utils/auth.ts'

/**
 * 界面要展示的「我是谁」。
 *
 * 两个来源：`GET /auth/profile` 是权威资料，JWT 里的 `username`/`role` 是离线兜底
 * （网关不通时也得能显示登录身份 —— 否则用户会以为没登录）。谁的字段有值就用谁的，
 * 但**不合并**：资料到手就整份以资料为准，避免用户名一半来自令牌一半来自服务端。
 *
 * 头像只做首字母占位：服务端的头像地址是相对路径且取图要带令牌，直接在 `<img>` 里引
 * 会是一次必然失败的请求。
 */

type AccountSource = 'profile' | 'token'

interface AccountIdentity {
  name: string
  /** 头像占位字：中文取首字，拉丁取首字母 */
  initials: string
  /** 邮箱优先，其次手机号；都没有就是 null（不编假数据） */
  detail: string | null
  roleLabel: string
  source: AccountSource
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '管理员',
  USER: '用户'
}

/** 角色文案走映射表：新增角色只加一行，不改分支 */
function findRoleLabel(role: string | null | undefined): string {
  if (!role) return '未知角色'
  return ROLE_LABELS[role] ?? role
}

/** `Array.from` 按码点切分，emoji 之类的代理对不会被劈成半个字符 */
function findInitials(name: string): string {
  const first = Array.from(name.trim())[0]
  return first ? first.toUpperCase() : '?'
}

function findAccountIdentity(
  profile: AuthProfile | null | undefined,
  claims: AuthClaims | null | undefined
): AccountIdentity | null {
  const profileName = profile?.username?.trim()
  const tokenName = claims?.username?.trim()
  const name = profileName || tokenName

  // 连用户名都没有就说明「没有身份可展示」，调用方按未登录处理
  if (!name) return null

  return {
    name,
    initials: findInitials(name),
    detail: profile ? profile.email || profile.phone || null : null,
    roleLabel: findRoleLabel(profile?.role || claims?.role),
    source: profileName ? 'profile' : 'token'
  }
}

export { findAccountIdentity, findInitials, findRoleLabel }
export type { AccountIdentity, AccountSource }
