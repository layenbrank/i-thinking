import type { DocumentType } from '@tiptap/vue-3'

declare global {
	type Markdown = Omit<DocumentType, 'attrs'> & StoreSchema
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		metadata: {
			/**
			 * 设置文档元数据
			 */
			setMetadata: (
				metadata: Partial<{
					id: string
					createdAt: number
					updatedAt: number
				}>
			) => ReturnType
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
