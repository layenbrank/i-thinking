type ApplicationWindowType = ReturnType<(typeof import('ant-design-vue'))['Modal']['info']>

type ApplicationSize = 'mini' | 'small' | 'medium' | 'large' | 'huge' | 'massive' | 'ultra'

type ApplicationDirection = 'horizontal' | 'vertical'

type ApplicationShape = 'square' | 'circle' | 'rectangle'

type ApplicationName =
	| 'app-bookmark'
	| 'app-calendar'
	| 'app-notepad'
	| 'app-store'
	| 'app-web'
	| 'app-settings'
	| 'app-example'

interface Application {
	width: string | null
	height: string | null
	round: string | null
	textSize: string | null
	textColor: string | null
	backgroundColor: string | null
	backgroundImage: string | null
	id: string
	slideID: string
	sort: number
	app: ApplicationName
	size: ApplicationSize
	name: string
	url?: string
	icon?: string
	direction: ApplicationDirection
	shape: ApplicationShape
	description: string
	downloadCount: number
}
