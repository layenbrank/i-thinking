import * as z from 'zod'

const IdentitySchema = z.enum(['system', 'assistant', 'user', 'tool'])

const ModelSchema = z.enum(['qwen3:8b', 'deepseek-r1:8b'])

const MessageSchema = z.object({
  role: IdentitySchema,
  content: z.string(),
  thinking: z.string().optional()
})

const ResponseSchema = z.object({
  model: ModelSchema,
  created_at: z.coerce.string(),
  message: MessageSchema,
  done: z.boolean(),
  done_reason: z.string().optional(),
  total_duration: z.number().optional(),
  load_duration: z.number().optional(),
  prompt_eval_count: z.number().optional(),
  prompt_eval_duration: z.number().optional(),
  eval_count: z.number().optional(),
  eval_duration: z.number().optional()
})

// export { ResponseSchema, IdentitySchema, ModelSchema, MessageSchema }

declare namespace Application {
  namespace Intelligence {
    interface AiSession {
      id: string
      title: string
      pinned: boolean
      collectionID: string | null
      createdAt: number
      updatedAt: number
    }

    interface AiCollection {
      id: string
      title: string
      createdAt: number
      updatedAt: number
    }

    interface AiMessage {
      id: string
      identity: Communicate.Identity
      fragment: string
      thinking: string | null
      sessionID: string
      createdAt: number
      updatedAt: number
    }

    namespace Communicate {
      interface Params {
        model: Model
        raw?: boolean
        stream?: boolean
        messages: Message[]
      }

      type Response = z.infer<typeof ResponseSchema>

      type Identity = z.infer<typeof IdentitySchema>

      type Model = z.infer<typeof ModelSchema>

      type Message = z.infer<typeof MessageSchema>

      export { Identity, Model, Message, Response, Params }
    }

    export { Communicate, AiMessage, AiSession, AiCollection }
  }

  export { Intelligence }
}
