import { z } from 'zod'

export const storeGetSchema = z.object({
  key: z.string().min(1)
})

export const storeSetSchema = z.object({
  key: z.string().min(1),
  value: z.unknown()
})

export const storeHasSchema = storeGetSchema
export const storeDeleteSchema = storeGetSchema

export const dialogFilterSchema = z.object({
  name: z.string(),
  extensions: z.array(z.string())
})

export const dialogOpenSchema = z
  .object({
    multiple: z.boolean().optional(),
    filters: z.array(dialogFilterSchema).optional()
  })
  .optional()

export const dialogSaveSchema = z
  .object({
    defaultPath: z.string().optional(),
    filters: z.array(dialogFilterSchema).optional()
  })
  .optional()

const optionalEmail = z
  .union([z.string().email(), z.literal('')])
  .optional()

export const userCreateSchema = z.object({
  name: z.string().optional(),
  email: optionalEmail
})

export const userUpdateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().optional(),
  email: optionalEmail
})

export const userRemoveSchema = z.object({
  id: z.number().int().positive()
})

export const sidecarNameSchema = z.object({
  name: z.string().min(1)
})

export const sidecarExecSchema = z.object({
  name: z.string().min(1),
  args: z
    .array(z.string().max(4096).refine(function (value) {
      return !value.includes('\0')
    }, 'null bytes are not allowed'))
    .max(64)
    .optional()
})

export const devtoolsVisibleSchema = z.object({
  visible: z.boolean()
})

export type StoreGetInput = z.infer<typeof storeGetSchema>
export type StoreSetInput = z.infer<typeof storeSetSchema>
export type DialogOpenInput = z.infer<typeof dialogOpenSchema>
export type DialogSaveInput = z.infer<typeof dialogSaveSchema>
export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
export type UserRemoveInput = z.infer<typeof userRemoveSchema>
export type SidecarNameInput = z.infer<typeof sidecarNameSchema>
export type SidecarExecInput = z.infer<typeof sidecarExecSchema>
export type DevtoolsVisibleInput = z.infer<typeof devtoolsVisibleSchema>
