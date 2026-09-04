import { z } from 'zod'

interface ReadR {
  visible: boolean
}

interface UpdateP {
  visible: boolean
}

const UpdateSchema = z.object({
  visible: z.boolean()
})

export { UpdateSchema }
export type { ReadR, UpdateP }
