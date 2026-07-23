import { z } from 'zod'

type GetInput = {
  key: string
}

type SetInput = {
  key: string
  value: unknown
}

const getSchema = z.object({
  key: z.string().min(1)
})

const setSchema = z.object({
  key: z.string().min(1),
  value: z.unknown()
})

const hasSchema = getSchema
const deleteSchema = getSchema

export type { GetInput, SetInput }
export { getSchema, setSchema, hasSchema, deleteSchema }
