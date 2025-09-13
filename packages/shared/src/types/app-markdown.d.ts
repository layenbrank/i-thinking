import type { DocumentType } from '@tiptap/vue-3'

export {}

declare global {
	type Markdown = Omit<DocumentType, 'attrs'> & Schema
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		metadata: {
			/**
			 * 设置文档元数据
			 */
			setMetadata: (metadata: Partial<Schema>) => ReturnType
		}
	}

	interface Storage {
		metadata: {
			id: string
			createdAt: number
			updatedAt: number
		}
	}
}
