// import { Add, Cloud, Download, Settings } from '@vicons/ionicons5'
import DownloadMarker from '~icons/ant-design/cloud-download-outlined'
import CloudMarker from '~icons/ant-design/cloud-upload-outlined'
import InsertMarker from '~icons/ant-design/plus-circle-outlined'
import SettingsMarker from '~icons/ant-design/setting-outlined'

// import SlideView from '@/assets/wallpaper/slide-view-bg.jpg'

const AppBookmark = defineAsyncComponent(function () {
	return import('@/components/applications/bookmark/index.vue')
})
const AppCalendar = defineAsyncComponent(function () {
	return import('@/components/applications/calendar/index.vue')
})
const AppMarkdown = defineAsyncComponent(function () {
	return import('@/components/applications/markdown/index.vue')
})
const AppIntelligence = defineAsyncComponent(function () {
	return import('@/components/applications/intelligence/index.vue')
})
const AppNavigation = defineAsyncComponent(function () {
	return import('@/components/applications/navigation/index.vue')
})
const AppSettings = defineAsyncComponent(function () {
	return import('@/components/applications/settings/index.vue')
})
const AppMarketplace = defineAsyncComponent(function () {
	return import('@/components/applications/marketplace/index.vue')
})
const AppExample = defineAsyncComponent(function () {
	return import('@/components/applications/example/index.vue')
})

const commonMenuOptions: ContextMenuOptions[] = [
	{
		label: '添加应用',
		key: 'update-app',
		icon: markRaw(InsertMarker)
	},
	{
		label: '更新大小',
		key: 'update-size',
		icon: markRaw(InsertMarker)
	},
	{
		label: '更新布局',
		key: 'update-layouts',
		icon: markRaw(InsertMarker)
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

type ContextMenuReflect = Partial<Record<Application.Component, () => ContextMenuOptions[]>>

export const contextmenuReflect: ContextMenuReflect = {
	bookmark() {
		return commonMenuOptions
	},
	calendar() {
		return commonMenuOptions
	},
	markdown() {
		return commonMenuOptions
	},
	navigation() {
		return commonMenuOptions
	},
	settings() {
		return commonMenuOptions
	},
	clipchamp() {
		return commonMenuOptions
	},
	intelligence() {
		return commonMenuOptions
	},
	marketplace() {
		return commonMenuOptions
	},
	example() {
		return commonMenuOptions
	}
}

// const slidesStore = useSlidesStore()

export const sizes: readonly Application.Size[] = [
	'small',
	'medium',
	'large',
	'huge',
	'massive',
	'ultra'
]

// const demo: Application.BookmarkFolder = ''

export const appReflect: Application.Reflect = {
	bookmark() {
		return <AppBookmark />
	},
	calendar() {
		return <AppCalendar />
	},
	markdown() {
		return <AppMarkdown />
	},
	settings() {
		return <AppSettings />
	},
	navigation() {
		return <AppNavigation />
	},
	intelligence() {
		return <AppIntelligence />
	},
	marketplace() {
		return <AppMarketplace />
	},
	example() {
		return <AppExample />
	}
}
// export function useAppController(el: Ref<InstanceType<typeof AppMenu> | null>) {

//   return {
//     activeApp,
//     appReflect,
//     handleResize,
//     drawerVisible,

//     menuOptions,
//     activeMenuKey,
//     contextmenuMap,
//     updateActiveKey,
//     openContextMenu,
//     contextmenuRect,
//     closeContextMenu,
//     contextmenuVisible
//   }
// }
