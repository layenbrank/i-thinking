import { z } from 'zod'

export const KeyCodeIDSchema = z.enum(['screenshot', 'escape'])
export type KeyCodeID = z.infer<typeof KeyCodeIDSchema>

export const KeyCodeBindingsSchema = z
  .object({
    screenshot: z.string().min(1).optional(),
    escape: z.string().min(1).optional()
  })
  .strict()

export type KeyCodeBindings = {
  screenshot: string
  escape: string
}

export const KeyCodeSchema = z
  .object({
    version: z.literal(1),
    bindings: KeyCodeBindingsSchema.optional()
  })
  .strict()

export type KeyCodeConfigureV1 = z.infer<typeof KeyCodeSchema>

export const DEFAULT_KEYCODE_BINDINGS: KeyCodeBindings = {
  screenshot: 'Alt+Q',
  escape: 'Escape'
}
