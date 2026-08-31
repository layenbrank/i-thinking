import { z } from 'zod'

interface UpdateVisibleP {
  visible: boolean
}

type UpdateVisibleR = void

const UpdateVisibleSchema = z.object({
  visible: z.boolean()
})

export type { UpdateVisibleP, UpdateVisibleR }
export { UpdateVisibleSchema }
