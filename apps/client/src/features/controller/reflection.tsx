import React from 'react'

const Bookmark = React.lazy(function () {
  return import('@/features/applications/bookmark/bookmark.tsx')
})
const Calendar = React.lazy(function () {
  return import('@/features/applications/calendar/calendar.tsx')
})
const Clock = React.lazy(function () {
  return import('@/features/applications/clock/clock.tsx')
})
const Countdown = React.lazy(function () {
  return import('@/features/applications/countdown/countdown.tsx')
})
const Collection = React.lazy(function () {
  return import('@/features/applications/collection/collection.tsx')
})
const Code = React.lazy(function () {
  return import('@/features/applications/code/code.tsx')
})
const Developer = React.lazy(function () {
  return import('@/features/applications/developer/developer.tsx')
})
const Example = React.lazy(function () {
  return import('@/features/applications/example/example.tsx')
})
const Intelligence = React.lazy(function () {
  return import('@/features/applications/intelligence/intelligence.tsx')
})
const Morph = React.lazy(function () {
  return import('@/features/applications/morph/morph.tsx')
})
const Markdown = React.lazy(function () {
  return import('@/features/applications/markdown/markdown.tsx')
})
const Navigation = React.lazy(function () {
  return import('@/features/applications/navigation/navigation.tsx')
})
const Settings = React.lazy(function () {
  return import('@/features/applications/settings/settings.tsx')
})
const Clipchamp = React.lazy(function () {
  return import('@/features/applications/clipchamp/clipchamp.tsx')
})
const Marketplace = React.lazy(function () {
  return import('@/features/applications/marketplace/marketplace.tsx')
})

const Gallery = React.lazy(function () {
  return import('@/features/applications/gallery/gallery.tsx')
})
const Signboard = React.lazy(function () {
  return import('@/features/applications/signboard/signboard.tsx')
})
const Screenshot = React.lazy(function () {
  return import('@/features/applications/screenshot/screenshot.tsx')
})

const Reflection: Readonly<Application.Reflection> = {
  bookmark: Bookmark,
  calendar: Calendar,
  code: Code,
  clipchamp: Clipchamp,
  clock: Clock,
  countdown: Countdown,
  intelligence: Intelligence,
  settings: Settings,
  navigation: Navigation,
  markdown: Markdown,
  morph: Morph,
  marketplace: Marketplace,
  developer: Developer,
  example: Example,
  collection: Collection,
  gallery: Gallery,
  signboard: Signboard,
  screenshot: Screenshot
}

export {
  Bookmark,
  Calendar,
  Clipchamp,
  Clock,
  Code,
  Collection,
  Countdown,
  Developer,
  Example,
  Gallery,
  Intelligence,
  Markdown,
  Marketplace,
  Navigation,
  Reflection,
  Screenshot,
  Settings,
  Signboard
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
