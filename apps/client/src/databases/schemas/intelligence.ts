// import { Communicate } from '@machenike.com/ai'
import type { Communicate } from '@/apis/intelligence.ts'

export interface AiSession {
	id: string
	sort: number
	title: string
	userID: string
	createdAt: number
	updatedAt: number
}

export interface AiMessage extends Communicate.Message {
	id: string
	sessionID: string
	createdAt: number
	updatedAt: number
}
