import { z } from 'zod'

interface WriteP {
  name?: string
  /** 合法邮箱，或空字符串表示清空 */
  email?: string
}

interface UpdateP {
  id: string
  name?: string
  email?: string
}

interface RemoveP {
  id: string
}

interface ReadR {
  id: string
  createdAt: string
  updatedAt: string
  name: string | null
  email: string | null
}

type WriteR = ReadR
type UpdateR = ReadR
type RemoveR = void

const OptionalEmail = z.union([z.string().email(), z.literal('')]).optional()

const WriteSchema = z.object({
  name: z.string().optional(),
  email: OptionalEmail
})

const UpdateSchema = z.object({
  id: z.uuid(),
  name: z.string().optional(),
  email: OptionalEmail
})

const RemoveSchema = z.object({
  id: z.uuid()
})

export type { WriteP, UpdateP, RemoveP, ReadR, WriteR, UpdateR, RemoveR }
export { WriteSchema, UpdateSchema, RemoveSchema }
