/**
 * @description 应用组件
 */
interface Application {
	id: string
	index: number
	title: string
	url: string | null
	round: string | null
	mark: string | null
	mirrorID: string
	textSize: string | null
	updatedAt: number
	createdAt: number
	textColor: string | null
	component: Application.Component
	description: string
	collectionID: string | null
	downloadCount: number
	background: Application.Background | null
	backdrop: Application.Backdrop | null
}

declare namespace Application {
	type Collection = Omit<Application, 'mirrorID'>

	/**
	 * @description 组件名称
	 */
	type Component =
		| 'bookmark'
		| 'calendar'
		| 'markdown'
		| 'settings'
		| 'clipchamp'
		| 'intelligence'
		| 'navigation'
		| 'marketplace'
		| 'developer'
		| 'collection'
		| 'signboard'
		| 'clock'
		| 'gallery' // 图库
		| 'example'

	interface Backdrop {
		blur?: string
		brightness?: string
		contrast?: string
		dropShadow?: string
		grayscale?: string
		hueRotate?: string
		opacity?: string
		saturate?: string
		sepia?: string
		url?: string
	}

	interface Background {
		color?: string
		image?: string
		repeat?: string
		size?: string
		position?: string
		attachment?: string
		clip?: string
		blendMode?: string
		origin?: string
	}

	type Overlay = ReturnType<(typeof import('ant-design-vue'))['Modal']['info']>
	// type Overlay = ReturnType<Modal['info']>
}
