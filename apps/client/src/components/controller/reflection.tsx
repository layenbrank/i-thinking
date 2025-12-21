import React, { type JSX } from 'react'
import type { ProviderProps } from '@/components/application/application.tsx'

// import Bookmark from '@/components/applications/bookmark/index.tsx'
// import Calendar from '@/components/applications/calendar/index.tsx'
// import Developer from '@/components/applications/developer/index.tsx'
// import Example from '@/components/applications/example/index.tsx'
// import Intelligence from '@/components/applications/intelligence/index.tsx'
// import Markdown from '@/components/applications/markdown/index.tsx'
// import Navigation from '@/components/applications/navigation/index.tsx'
// import Settings from '@/components/applications/settings/index.tsx'

const Bookmark = React.lazy(function () {
	return import('@/components/applications/bookmark/bookmark.tsx')
})
const Calendar = React.lazy(function () {
	return import('@/components/applications/calendar/calendar.tsx')
})
const Developer = React.lazy(function () {
	return import('@/components/applications/developer/developer.tsx')
})
const Example = React.lazy(function () {
	return import('@/components/applications/example/example.tsx')
})
const Intelligence = React.lazy(function () {
	return import('@/components/applications/intelligence/intelligence.tsx')
})
const Markdown = React.lazy(function () {
	return import('@/components/applications/markdown/markdown.tsx')
})
const Navigation = React.lazy(function () {
	return import('@/components/applications/navigation/navigation.tsx')
})
const Settings = React.lazy(function () {
	return import('@/components/applications/settings/settings.tsx')
})
const Clipchamp = React.lazy(function () {
	return import('@/components/applications/clipchamp/clipchamp.tsx')
})
const Marketplace = React.lazy(function () {
	return import('@/components/applications/marketplace/marketplace.tsx')
})
const Clock = React.lazy(function () {
	return import('@/components/applications/clock/clock.tsx')
})
const Collection = React.lazy(function () {
	return import('@/components/applications/collection/collection.tsx')
})
const Gallery = React.lazy(function () {
	return import('@/components/applications/gallery/gallery.tsx')
})
const Signboard = React.lazy(function () {
	return import('@/components/applications/signboard/signboard.tsx')
})

const Reflection: Readonly<Application.Reflection> = {
	bookmark: Bookmark,
	calendar: Calendar,
	intelligence: Intelligence,
	settings: Settings,
	navigation: Navigation,
	clipchamp: Clipchamp,
	markdown: Markdown,
	marketplace: Marketplace,
	developer: Developer,
	example: Example,
	clock: Clock,
	collection: Collection,
	gallery: Gallery,
	signboard: Signboard
}

export {
	Bookmark,
	Calendar,
	Intelligence,
	Settings,
	Navigation,
	Clipchamp,
	Markdown,
	Marketplace,
	Developer,
	Example,
	Clock,
	Collection,
	Gallery,
	Signboard,
	Reflection
}

// const Applications = import.meta.glob<(props: ProviderProps) => JSX.Element>(
// 	'@/components/applications/*/index.tsx',
// 	{
// 		eager: true,
// 		import: 'default'
// 	}
// )
// console.log('Applications', Applications)
// const Reflection: Readonly<Application.Reflection> = Object.entries(Applications).reduce(
// 	(ref, [, component]) => {
// 		const name = component.name.toLowerCase() as keyof Application.Reflection
// 		ref[name] = component
// 		return ref
// 	},
// 	{} as Application.Reflection
// )
// console.log('Reflection', Reflection)
