import Bookmark from '@/components/applications/bookmark/index.tsx'
import Calendar from '@/components/applications/calendar/index.tsx'
import Example from '@/components/applications/example/index.tsx'
import Intelligence from '@/components/applications/intelligence/index.tsx'
import Navigation from '@/components/applications/navigation/index.tsx'

export const Reflection: Readonly<Application.Reflection> = {
	bookmark: Bookmark,
	calendar: Calendar,
	intelligence: Intelligence,
	navigation: Navigation,
	clipchamp: Bookmark,
	markdown: Bookmark,
	settings: Bookmark,
	store: Bookmark,
	example: Example
}
