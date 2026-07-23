import { z } from 'zod'

type VisibleInput = {
  visible: boolean
}

const updateVisibleSchema = z.object({
  visible: z.boolean()
})

export type { VisibleInput }
export { updateVisibleSchema }
