import type { DocumentType } from '@tiptap/vue-3'

export {}

declare global {
  // type Markdown = Omit<DocumentType, 'attrs'> & Schema
  type Markdown = Schema & DocumentType & { index: number }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    metadata: {
      /**
       * 设置文档元数据
       */
      setMetadata: (metadata: Partial<Schema & { index: number }>) => ReturnType
    }
  }

  interface Storage {
    metadata: {
      id: string
      index: number
      createdAt: number
      updatedAt: number
    }
  }
}
