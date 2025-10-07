// import { Add, Cloud, Download, Settings } from '@vicons/ionicons5'
import Download from '~icons/ant-design/cloud-download-outlined'
import Cloud from '~icons/ant-design/cloud-upload-outlined'
import Add from '~icons/ant-design/plus-circle-outlined'
import Settings from '~icons/ant-design/setting-outlined'

// import SlideView from '@/assets/wallpaper/slide-view-bg.jpg'

const AppBookmark = defineAsyncComponent(function () {
	return import('@/components/applications/app-bookmark/app-bookmark.vue')
})

const AppCalendar = defineAsyncComponent(function () {
	return import('@/components/applications/app-calendar/app-calendar.vue')
})
const AppMarkdown = defineAsyncComponent(function () {
	return import('@/components/applications/app-markdown/app-markdown.vue')
})
const AppIntelligence = defineAsyncComponent(function () {
	return import('@/components/applications/app-intelligence/app-intelligence.vue')
})

const AppNavigation = defineAsyncComponent(function () {
	return import('@/components/applications/app-navigation/app-navigation.vue')
})

const AppSettings = defineAsyncComponent(function () {
	return import('@/components/applications/app-settings/app-settings.vue')
})
const AppStore = defineAsyncComponent(function () {
	return import('@/components/applications/app-store/app-store.vue')
})
const AppExample = defineAsyncComponent(function () {
	return import('@/components/applications/app-example/app-example.vue')
})

const commonMenuOptions: ContextMenuOptions[] = [
	{
		label: '添加应用',
		key: 'update-app',
		icon: markRaw(Add)
	},
	{
		label: '更新大小',
		key: 'update-size',
		icon: markRaw(Add)
	},
	{
		label: '更新布局',
		key: 'update-layouts',
		icon: markRaw(Add)
	},
	{
		label: '更换壁纸',
		key: 'update-wallpaper',
		icon: markRaw(Download)
	},
	{
		label: '备份云端',
		key: 'update-backup',
		icon: markRaw(Cloud)
	},
	{
		label: '设置',
		key: 'update-settings',
		icon: markRaw(Settings)
	}
]

export const contextmenuReflect: Record<
	Partial<Application.Component>,
	() => ContextMenuOptions[]
> = {
	'app-bookmark'() {
		return commonMenuOptions
	},
	'app-calendar'() {
		return commonMenuOptions
	},
	'app-markdown'() {
		return commonMenuOptions
	},
	'app-navigation'() {
		return commonMenuOptions
	},
	'app-settings'() {
		return commonMenuOptions
	},
	'app-clipchamp'() {
		return commonMenuOptions
	},
	'app-intelligence'() {
		return commonMenuOptions
	},
	'app-store'() {
		return commonMenuOptions
	},
	'app-example'() {
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
	'app-bookmark'() {
		return <AppBookmark />
	},
	'app-calendar'() {
		return <AppCalendar />
	},
	'app-markdown'() {
		return <AppMarkdown />
	},
	'app-settings'() {
		return <AppSettings />
	},
	'app-navigation'() {
		return <AppNavigation />
	},
	'app-intelligence'() {
		return <AppIntelligence />
	},
	'app-store'() {
		return <AppStore />
	},
	'app-example'() {
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
