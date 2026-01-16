import { http } from '@/utils/http/http.ts'
import { ENGINE_TOKEN } from '@/utils/http/token.ts'

export interface PushChangesRequest {
  clientId: string
  changes: Array<{
    id: string
    entity: string
    op: 'upsert' | 'delete'
    entityId: string
    payload: unknown
    createdAt: number
  }>
}

export interface PushChangesResponse {
  ackIds: string[]
}

export function POST_SYNC_PUSH(data: PushChangesRequest) {
  return http.post<RSF<PushChangesResponse>>('/sync/push', data, {
    context: ENGINE_TOKEN
  })
}
