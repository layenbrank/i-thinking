import { z } from 'zod'

interface ReadP {
  key: string
}

type ReadR = unknown

interface WriteP {
  key: string
  value: unknown
}

type WriteR = void

interface RemoveP {
  key: string
}

type RemoveR = void

interface HasP extends ReadP {}

type HasR = boolean

const ReadSchema = z.object({
  key: z.string().min(1)
})

const WriteSchema = z.object({
  key: z.string().min(1),
  value: z.unknown()
})

const HasSchema = ReadSchema
const RemoveSchema = ReadSchema

export type { ReadP, ReadR, WriteP, WriteR, RemoveP, RemoveR, HasP, HasR }
export { ReadSchema, WriteSchema, HasSchema, RemoveSchema }
