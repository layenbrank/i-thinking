import AppBookmark from '@/components/applications/app-bookmark/AppBookmark.tsx'

export const Reflect: Record<ApplicationName, (props: AppComponentProps) => () => JSX.Element> = {
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
	'app-notepad'(props) {
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
	'app-web'(props) {
		return function () {
			return <AppBookmark {...props} />
		}
	}
}
