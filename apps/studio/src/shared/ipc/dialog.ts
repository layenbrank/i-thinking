import { z } from 'zod'

interface Filter {
  name: string
  extensions: string[]
}

interface OpenP {
  multiple?: boolean
  filters?: Filter[]
}

type OpenR = string[] | null

interface SaveP {
  defaultPath?: string
  filters?: Filter[]
}

type SaveR = string | null

const FilterSchema = z.object({
  name: z.string(),
  extensions: z.array(z.string())
})

const OpenSchema = z
  .object({
    multiple: z.boolean().optional(),
    filters: z.array(FilterSchema).optional()
  })
  .optional()

const SaveSchema = z
  .object({
    defaultPath: z.string().optional(),
    filters: z.array(FilterSchema).optional()
  })
  .optional()

export type { Filter, OpenP, OpenR, SaveP, SaveR }
export { OpenSchema, SaveSchema }
