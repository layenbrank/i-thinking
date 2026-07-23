import { z } from 'zod'

type Filter = {
  name: string
  extensions: string[]
}

type OpenInput = {
  multiple?: boolean
  filters?: Filter[]
}

type SaveInput = {
  defaultPath?: string
  filters?: Filter[]
}

const filterSchema = z.object({
  name: z.string(),
  extensions: z.array(z.string())
})

const openSchema = z
  .object({
    multiple: z.boolean().optional(),
    filters: z.array(filterSchema).optional()
  })
  .optional()

const saveSchema = z
  .object({
    defaultPath: z.string().optional(),
    filters: z.array(filterSchema).optional()
  })
  .optional()

export type { Filter, OpenInput, SaveInput }
export { openSchema, saveSchema }
