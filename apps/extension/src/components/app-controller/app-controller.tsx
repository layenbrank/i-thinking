import type { ApplicationReflect } from '@desktop-app/shared/app-controller'
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
const AppNotePad = defineAsyncComponent(function () {
	return import('@/components/applications/app-notepad/app-notepad.vue')
})

const AppStore = defineAsyncComponent(function () {
	return import('@/components/applications/app-store/app-store.vue')
})

const AppWeb = defineAsyncComponent(function () {
	return import('@/components/applications/app-web/app-web.vue')
})

const AppSettings = defineAsyncComponent(function () {
	return import('@/components/applications/app-settings/app-settings.vue')
})
const AppExample = defineAsyncComponent(function () {
	return import('@/components/applications/app-example/app-example.vue')
})

const commonMenuOPtions: ContextMenuOptions[] = [
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

export const contextmenuReflect: Record<Partial<ApplicationName>, () => ContextMenuOptions[]> = {
	'app-bookmark'() {
		return commonMenuOPtions
	},
	'app-calendar'() {
		return commonMenuOPtions
	},
	'app-notepad'() {
		return commonMenuOPtions
	},
	'app-store'() {
		return commonMenuOPtions
	},
	'app-web'() {
		return commonMenuOPtions
	},
	'app-example'() {
		return commonMenuOPtions
	},
	'app-settings'() {
		return commonMenuOPtions
	}
}

// const slidesStore = useSlidesStore()

export const sizes: ReadonlyArray<ApplicationSize> = [
	'small',
	'medium',
	'large',
	'huge',
	'massive',
	'ultra'
]

export const appReflect: ApplicationReflect = {
	'app-bookmark'() {
		return <AppBookmark />
	},
	'app-calendar'() {
		return <AppCalendar />
	},
	'app-store'() {
		return <AppStore />
	},
	'app-example'() {
		return <AppExample />
	},
	'app-web'() {
		return <AppWeb />
	},
	'app-settings'() {
		return <AppSettings />
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
