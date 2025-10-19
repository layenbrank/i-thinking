import Bookmark from '@/components/applications/bookmark/bookmark.tsx'
import Calendar from '@/components/applications/calendar/calendar.tsx'
import Intelligence from '@/components/applications/intelligence/intelligence.tsx'
import Navigation from '@/components/applications/navigation/navigation.tsx'
import { ReactElement } from 'react'

// (props: AppComponentProps) => () => JSX.Element
export const Reflect: Record<
	Application.Component,
	(props: AppComponentProps) => () => ReactElement
> = {
	'app-bookmark'(props) {
		return function () {
			return <Bookmark {...props} />
		}
	},
	'app-calendar'(props) {
		return function () {
			return <Calendar {...props} />
		}
	},
	'app-example'(props) {
		return function () {
			return <Bookmark {...props} />
		}
	},
	'app-markdown'(props) {
		return function () {
			return <Bookmark {...props} />
		}
	},
	'app-settings'(props) {
		return function () {
			return <Bookmark {...props} />
		}
	},
	'app-store'(props) {
		return function () {
			return <Bookmark {...props} />
		}
	},
	'app-clipchamp'(props) {
		return function () {
			return <Bookmark {...props} />
		}
	},
	'app-intelligence'(props) {
		return function () {
			return <Intelligence {...props} />
		}
	},
	'app-navigation'(props) {
		return function () {
			return <Navigation {...props} />
		}
	}
}
