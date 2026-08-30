declare namespace MagneticTile {
  namespace Intelligence {
    interface AiSession {
      id: string
      title: string
      pinned: boolean
      workspaceID: string | null
      createdAt: number
      updatedAt: number
    }

    interface AiWorkspace {
      id: string
      title: string
      icon: string
      color: string
      pinned: boolean
      archivedAt: number | null
      createdAt: number
      updatedAt: number
    }

    interface AiWorkspaceFolder {
      id: string
      workspaceID: string
      path: string
      isPrimary: boolean
      sort: number
      createdAt: number
      updatedAt: number
    }

    interface AiMessage {
      id: string
      identity: Identity
      fragment: string
      thinking: string | null
      parts: string | null
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

      type Identity = 'system' | 'assistant' | 'user' | 'tool'

      type Model = 'qwen3:8b' | 'deepseek-r1:8b'

      interface Message {
        role: Identity
        content: string
        thinking?: string
      }

      interface Response {
        model: Model
        created_at: string
        message: Message
        done: boolean
        done_reason?: string
        total_duration?: number
        load_duration?: number
        prompt_eval_count?: number
        prompt_eval_duration?: number
        eval_count?: number
        eval_duration?: number
      }
    }
  }
}
