import { z } from 'zod'

type NameInput = {
  name: string
}

type ExecInput = {
  name: string
  args?: string[]
}

type ExecResult = {
  code: number | null
  signal: string | null
  stdout?: string
  stderr?: string
  error?: string
}

const nameSchema = z.object({
  name: z.string().min(1)
})

const execSchema = z.object({
  name: z.string().min(1),
  args: z
    .array(
      z
        .string()
        .max(4096)
        .refine(function (value) {
          return !value.includes('\0')
        }, 'null bytes are not allowed')
    )
    .max(64)
    .optional()
})

export type { NameInput, ExecInput, ExecResult }
export { nameSchema, execSchema }
