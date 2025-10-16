import AppBookmark from '@/components/applications/app-bookmark/AppBookmark.tsx'

export const Reflect: Record<
	Application.Component,
	(props: AppComponentProps) => () => JSX.Element
> = {
	'app-bookmark'(props) {
		return function () {
			return <AppBookmark {...props} />
		}
	},
	'app-calendar'(props) {
		return function () {
			return <AppBookmark {...props} />
		}
	},
	'app-example'(props) {
		return function () {
			return <AppBookmark {...props} />
		}
	},
	'app-markdown'(props) {
		return function () {
			return <AppBookmark {...props} />
		}
	},
	'app-settings'(props) {
		return function () {
			return <AppBookmark {...props} />
		}
	},
	'app-store'(props) {
		return function () {
			return <AppBookmark {...props} />
		}
	},
	'app-clipchamp'(props) {
		return function () {
			return <AppBookmark {...props} />
		}
	},
	'app-intelligence'(props) {
		return function () {
			return <AppBookmark {...props} />
		}
	},
	'app-navigation'(props) {
		return function () {
			return <AppBookmark {...props} />
		}
	}
}
