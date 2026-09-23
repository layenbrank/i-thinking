import { HttpEnvelope } from '@/utils/http.errors.ts'
import { http } from '@/utils/http.ts'

/**
 * 对齐 rust-service `gateway` 模块（`/api/v1/gateway`）。
 *
 * 用户面：
 * - `GET /gateway/models` — 当前身份可用模型
 * - `POST /gateway/chat/completions` — OpenAI 兼容转发（由 ChatModelPort 直连，不经本文件）
 */

/** 网关模型行（与 rust-service `ModelR` 对齐） */
interface GatewayModel {
  id: string
  providerID: string
  name: string
  label: string
  allowRoles?: string[] | null
  enabled: boolean
  dailyTokenQuota: number
  createdAt: number
  updatedAt: number
}

async function unwrap<T>(pending: Promise<RSF<T>>): Promise<T> {
  return HttpEnvelope(await pending)
}

/** 当前登录身份可用的模型目录 */
function GET_MODELS() {
  return unwrap(http.get<RSF<GatewayModel[]>>('/gateway/models'))
}

export { GET_MODELS }
export type { GatewayModel }
