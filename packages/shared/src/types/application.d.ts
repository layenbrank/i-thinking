/**
 * @description 应用组件
 */
interface Application {
	id: string
	index: number
	title: string
	// name: string
	url?: string
	size: Application.Size
	// width: string | null
	round: string | null
	shape: Application.Shape
	// height: string | null
	marker?: string
	mirrorID: string
	textSize: string | null
	updatedAt: number
	createdAt: number
	textColor: string | null
	component: Application.Component
	direction: Application.Direction
	description: string
	collectionID?: string
	downloadCount: number
	backgroundColor: string | null
	backgroundImage: string | null
	// backdropBlur: string | null
	// backdropSaturate: string | null
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

	/**
	 * @description 组件布局方向
	 */
	type Direction = 'horizontal' | 'vertical'

	/**
	 * @description 组件形状
	 */
	type Shape = 'square' | 'circle' | 'rectangle'

	/**
	 * @description 组件尺寸
	 */
	type Size = 'mini' | 'small' | 'medium' | 'large' | 'huge' | 'massive' | 'ultra'

	type Overlay = ReturnType<(typeof import('ant-design-vue'))['Modal']['info']>
	// type Overlay = ReturnType<Modal['info']>
}
