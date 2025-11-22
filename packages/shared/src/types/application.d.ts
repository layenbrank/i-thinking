type ApplicationWindowType = ReturnType<(typeof import('ant-design-vue'))['Modal']['info']>

/**
 * @description 应用组件
 */
interface Application {
	width: string | null
	height: string | null
	round: string | null
	textSize: string | null
	textColor: string | null
	backgroundColor: string | null
	backgroundImage: string | null
	// backdropBlur: string | null
	// backdropSaturate: string | null
	id: string
	screenID: string
	sort: number
	component: Application.Component
	size: Application.Size
	name: string
	url?: string
	marker?: string
	direction: Application.Direction
	shape: Application.Shape
	description: string
	downloadCount: number
	updatedAt: number
	createdAt: number
}

declare namespace Application {
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
		// | 'gallery' 图库
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

	interface CSSProperties {
		width: string
		height: string
		gridRow: string
		gridColumn: string
	}
}
