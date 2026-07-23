import { z } from 'zod'

type CreateInput = {
  name?: string
  /** 合法邮箱，或空字符串表示清空 */
  email?: string
}

type UpdateInput = {
  id: string
  name?: string
  email?: string
}

type RemoveInput = {
  id: string
}

type UserRecord = {
  id: string
  createdAt: string
  updatedAt: string
  name: string | null
  email: string | null
}

const optionalEmail = z.union([z.string().email(), z.literal('')]).optional()

const createSchema = z.object({
  name: z.string().optional(),
  email: optionalEmail
})

const updateSchema = z.object({
  id: z.uuid(),
  name: z.string().optional(),
  email: optionalEmail
})

const removeSchema = z.object({
  id: z.uuid()
})

export type { CreateInput, UpdateInput, RemoveInput, UserRecord }
export { createSchema, updateSchema, removeSchema }
