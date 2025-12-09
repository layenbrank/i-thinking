import DownloadMarker from '~icons/ant-design/cloud-download-outlined'
import CloudMarker from '~icons/ant-design/cloud-upload-outlined'
import RemoveMarker from '~icons/ant-design/delete-outlined'
import InsertMarker from '~icons/ant-design/plus-circle-outlined'
import SettingsMarker from '~icons/ant-design/setting-outlined'

const AppBookmark = defineAsyncComponent(function () {
	return import('@/components/applications/bookmark/bookmark.vue')
})
const AppCalendar = defineAsyncComponent(function () {
	return import('@/components/applications/calendar/calendar.vue')
})
const AppMarkdown = defineAsyncComponent(function () {
	return import('@/components/applications/markdown/markdown.vue')
})
const AppIntelligence = defineAsyncComponent(function () {
	return import('@/components/applications/intelligence/intelligence.vue')
})
const AppNavigation = defineAsyncComponent(function () {
	return import('@/components/applications/navigation/navigation.vue')
})
const AppSettings = defineAsyncComponent(function () {
	return import('@/components/applications/settings/settings.vue')
})
const AppMarketplace = defineAsyncComponent(function () {
	return import('@/components/applications/marketplace/marketplace.vue')
})
const AppClipchamp = defineAsyncComponent(function () {
	return import('@/components/applications/clipchamp/clipchamp.vue')
})
const AppCollection = defineAsyncComponent(function () {
	return import('@/components/applications/collection/collection.vue')
})
const AppSignboard = defineAsyncComponent(function () {
	return import('@/components/applications/signboard/signboard.vue')
})
const AppClock = defineAsyncComponent(function () {
	return import('@/components/applications/clock/clock.vue')
})
const AppGallery = defineAsyncComponent(function () {
	return import('@/components/applications/gallery/gallery.vue')
})
const AppExample = defineAsyncComponent(function () {
	return import('@/components/applications/example/example.vue')
})

type ContextMenuReflect = Partial<Record<Application.Component, () => ContextMenuOptions[]>>

const MENUOPTIONS: ContextMenuOptions[] = [
	{
		label: '添加应用',
		key: 'update-app',
		icon: markRaw(InsertMarker)
	},
	{
		label: '删除应用',
		key: 'remove-app',
		icon: markRaw(RemoveMarker)
	},
	{
		label: '更换壁纸',
		key: 'update-wallpaper',
		icon: markRaw(DownloadMarker)
	},
	{
		label: '备份云端',
		key: 'update-backup',
		icon: markRaw(CloudMarker)
	},
	{
		label: '设置',
		key: 'update-settings',
		icon: markRaw(SettingsMarker)
	}
]

const CONTEXTMENU: ContextMenuReflect = {}

const SIZES: readonly Application.Size[] = ['small', 'medium', 'large', 'huge', 'massive', 'ultra']

const APPLICATION: Application.Reflect = {
	bookmark: AppBookmark,
	calendar: AppCalendar,
	markdown: AppMarkdown,
	settings: AppSettings,
	navigation: AppNavigation,
	intelligence: AppIntelligence,
	marketplace: AppMarketplace,
	clipchamp: AppClipchamp,
	collection: AppCollection,
	clock: AppClock,
	signboard: AppSignboard,
	gallery: AppGallery,
	example: AppExample
}

interface ApplicationOptions {
	label: string
	value: Application.Component
}

const OPTIONS: ApplicationOptions[] = [
	{
		label: '书签',
		value: 'bookmark'
	},
	{
		label: '日历',
		value: 'calendar'
	},
	{
		label: '应用商店',
		value: 'marketplace'
	},
	{
		label: 'example',
		value: 'example'
	},
	{
		label: '备忘录',
		value: 'markdown'
	},
	{
		label: '设置',
		value: 'settings'
	},
	{
		label: 'AI Hub',
		value: 'intelligence'
	},
	{
		label: 'Clipchamp',
		value: 'clipchamp'
	},
	{
		label: '应用集合',
		value: 'collection'
	},
	{
		label: '开发者',
		value: 'developer'
	},
	{
		label: '导航',
		value: 'navigation'
	},
	{
		label: '图库',
		value: 'gallery'
	},
	{
		label: '时钟',
		value: 'clock'
	}
]

interface MirrorOptions {
	mirrorID: string | null
}

function useMirror(options?: MirrorOptions) {
	const MIRROR_ID = options?.mirrorID ?? window.crypto.randomUUID()

	const MIRRORS: readonly Mirror[] = Array.from({ length: 1 }).map(function () {
		const mirror: Mirror = {
			id: MIRROR_ID,
			title: '镜像-01',
			index: 0,
			marker: '',
			description: '默认镜像',
			updatedAt: Date.now(),
			createdAt: Date.now()
		}

		return mirror
	})

	const APPLICATIONS: readonly Application[] = OPTIONS.map(function (value) {
		const application: Application = {
			id: window.crypto.randomUUID(),
			size: 'mini',
			// size: 'small',
			// size: 'medium',
			// size: 'large',
			// size: 'huge',
			// size: 'massive',
			// size: 'ultra',
			title: value.label,
			index: 1,
			// shape: 'circle',
			shape: 'square',
			// shape: 'rectangle',
			round: '12px',
			mirrorID: MIRROR_ID,
			textSize: '13px',
			component: value.value,
			// direction: 'horizontal',
			direction: 'vertical',
			textColor: '#ffffff',
			updatedAt: Date.now(),
			createdAt: Date.now(),
			description: value.label,
			downloadCount: 1000,
			backgroundColor: '#ffffff',
			backgroundImage: null
		}
		return application
	})

	return {
		SIZES,
		MIRRORS,
		MIRROR_ID,
		APPLICATION,
		APPLICATIONS,
		CONTEXTMENU,
		MENUOPTIONS
	}
}

export { useMirror }
