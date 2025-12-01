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

type ApplicationStyle = Record<
	Application.Size,
	Record<Application.Shape, Record<Application.Direction, Application.CSSProperties>>
>

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

function useSettings(options: Application) {
	const width = options.width ?? 'var(--application-global-width)'
	const height = options.height ?? 'var(--application-global-height)'
	const { size, shape, direction } = options

	const componentStyle: ApplicationStyle = {
		mini: {
			circle: {
				horizontal: {
					width,
					height,
					gridRow: 'span 1',
					gridColumn: 'span 1'
				},
				vertical: {
					width,
					height,
					gridRow: 'span 1',
					gridColumn: 'span 1'
				}
			},
			rectangle: {
				horizontal: {
					width: `calc(${width} * 2 + var(--application-global-col-gap))`,
					height,
					gridRow: 'span 1',
					gridColumn: 'span 2'
				},
				vertical: {
					width,
					height: `calc(${height} * 2 + var(--application-global-row-gap))`,
					gridRow: 'span 2',
					gridColumn: 'span 1'
				}
			},
			square: {
				horizontal: {
					width,
					height,
					gridRow: 'span 1',
					gridColumn: 'span 1'
				},
				vertical: {
					width,
					height,
					gridRow: 'span 1',
					gridColumn: 'span 1'
				}
			}
		},
		small: {
			circle: {
				horizontal: {
					width: `calc(${width} * 2 + var(--application-global-col-gap))`,
					height: `calc(${height} * 2 + var(--application-global-row-gap))`,
					gridRow: 'span 2',
					gridColumn: 'span 2'
				},
				vertical: {
					width: `calc(${width} * 2 + var(--application-global-col-gap))`,
					height: `calc(${height} * 2 + var(--application-global-row-gap))`,
					gridRow: 'span 2',
					gridColumn: 'span 2'
				}
			},
			rectangle: {
				horizontal: {
					width: `calc(${width} * 4 + var(--application-global-col-gap) * 3)`,
					height: `calc(${height} * 2 + var(--application-global-row-gap) * 1)`,
					gridRow: 'span 2',
					gridColumn: 'span 4'
				},
				vertical: {
					width: `calc(${width} * 2 + var(--application-global-col-gap) * 1)`,
					height: `calc(${height} * 4 + var(--application-global-row-gap) * 3)`,
					gridRow: 'span 4',
					gridColumn: 'span 2'
				}
			},
			square: {
				horizontal: {
					width: `calc(${width} * 2 + var(--application-global-col-gap))`,
					height: `calc(${height} * 2 + var(--application-global-row-gap))`,
					gridRow: 'span 2',
					gridColumn: 'span 2'
				},
				vertical: {
					width: `calc(${width} * 2 + var(--application-global-col-gap))`,
					height: `calc(${height} * 2 + var(--application-global-row-gap))`,
					gridRow: 'span 2',
					gridColumn: 'span 2'
				}
			}
		},
		medium: {
			circle: {
				horizontal: {
					width: `calc(${width} * 3 + var(--application-global-col-gap) * 2)`,
					height: `calc(${height} * 3 + var(--application-global-row-gap) * 2)`,
					gridRow: 'span 3',
					gridColumn: 'span 3'
				},
				vertical: {
					width: `calc(${width} * 3 + var(--application-global-col-gap) * 2)`,
					height: `calc(${height} * 3 + var(--application-global-row-gap) * 2)`,
					gridRow: 'span 3',
					gridColumn: 'span 3'
				}
			},
			rectangle: {
				horizontal: {
					width: `calc(${width} * 5 + var(--application-global-col-gap) * 4)`,
					height: `calc(${height} * 3 + var(--application-global-row-gap) * 2)`,
					gridRow: 'span 3',
					gridColumn: 'span 5'
				},
				vertical: {
					width: `calc(${width} * 3 + var(--application-global-col-gap) * 2)`,
					height: `calc(${height} * 5 + var(--application-global-row-gap) * 4)`,
					gridRow: 'span 5',
					gridColumn: 'span 3'
				}
			},
			square: {
				horizontal: {
					width: `calc(${width} * 3 + var(--application-global-col-gap) * 2)`,
					height: `calc(${height} * 3 + var(--application-global-row-gap) * 2)`,
					gridRow: 'span 3',
					gridColumn: 'span 3'
				},
				vertical: {
					width: `calc(${width} * 3 + var(--application-global-col-gap) * 2)`,
					height: `calc(${height} * 3 + var(--application-global-row-gap) * 2)`,
					gridRow: 'span 3',
					gridColumn: 'span 3'
				}
			}
		},
		large: {
			circle: {
				horizontal: {
					width: `calc(${width} * 4 + var(--application-global-col-gap) * 3)`,
					height: `calc(${height} * 4 + var(--application-global-row-gap) * 3)`,
					gridRow: 'span 4',
					gridColumn: 'span 4'
				},
				vertical: {
					width: `calc(${width} * 4 + var(--application-global-col-gap) * 3)`,
					height: `calc(${height} * 4 + var(--application-global-row-gap) * 3)`,
					gridRow: 'span 4',
					gridColumn: 'span 4'
				}
			},
			rectangle: {
				horizontal: {
					width: `calc(${width} * 6 + var(--application-global-col-gap) * 5)`,
					height: `calc(${height} * 4 + var(--application-global-row-gap) * 3)`,
					gridRow: 'span 4',
					gridColumn: 'span 6'
				},
				vertical: {
					width: `calc(${width} * 4 + var(--application-global-col-gap) * 3)`,
					height: `calc(${height} * 6 + var(--application-global-row-gap) * 5)`,
					gridRow: 'span 6',
					gridColumn: 'span 4'
				}
			},
			square: {
				horizontal: {
					width: `calc(${width} * 4 + var(--application-global-col-gap) * 3)`,
					height: `calc(${height} * 4 + var(--application-global-row-gap) * 3)`,
					gridRow: 'span 4',
					gridColumn: 'span 4'
				},
				vertical: {
					width: `calc(${width} * 4 + var(--application-global-col-gap) * 3)`,
					height: `calc(${height} * 4 + var(--application-global-row-gap) * 3)`,
					gridRow: 'span 4',
					gridColumn: 'span 4'
				}
			}
		},
		huge: {
			circle: {
				horizontal: {
					width: `calc(${width} * 5 + var(--application-global-col-gap) * 4)`,
					height: `calc(${height} * 5 + var(--application-global-row-gap) * 4)`,
					gridRow: 'span 5',
					gridColumn: 'span 5'
				},
				vertical: {
					width: `calc(${width} * 5 + var(--application-global-col-gap) * 4)`,
					height: `calc(${height} * 5 + var(--application-global-row-gap) * 4)`,
					gridRow: 'span 5',
					gridColumn: 'span 5'
				}
			},
			rectangle: {
				horizontal: {
					width: `calc(${width} * 7 + var(--application-global-col-gap) * 6)`,
					height: `calc(${height} * 5 + var(--application-global-row-gap) * 4)`,
					gridRow: 'span 5',
					gridColumn: 'span 7'
				},
				vertical: {
					width: `calc(${width} * 5 + var(--application-global-col-gap) * 4)`,
					height: `calc(${height} * 7 + var(--application-global-row-gap) * 6)`,
					gridRow: 'span 7',
					gridColumn: 'span 5'
				}
			},
			square: {
				horizontal: {
					width: `calc(${width} * 5 + var(--application-global-col-gap) * 4)`,
					height: `calc(${height} * 5 + var(--application-global-row-gap) * 4)`,
					gridRow: 'span 5',
					gridColumn: 'span 5'
				},
				vertical: {
					width: `calc(${width} * 5 + var(--application-global-col-gap) * 4)`,
					height: `calc(${height} * 5 + var(--application-global-row-gap) * 4)`,
					gridRow: 'span 5',
					gridColumn: 'span 5'
				}
			}
		},
		massive: {
			circle: {
				horizontal: {
					width: `calc(${width} * 6 + var(--application-global-col-gap) * 5)`,
					height: `calc(${height} * 6 + var(--application-global-row-gap) * 5)`,
					gridRow: 'span 6',
					gridColumn: 'span 6'
				},
				vertical: {
					width: `calc(${width} * 6 + var(--application-global-col-gap) * 5)`,
					height: `calc(${height} * 6 + var(--application-global-row-gap) * 5)`,
					gridRow: 'span 6',
					gridColumn: 'span 6'
				}
			},
			rectangle: {
				horizontal: {
					width: `calc(${width} * 8 + var(--application-global-col-gap) * 7)`,
					height: `calc(${height} * 6 + var(--application-global-row-gap) * 5)`,
					gridRow: 'span 6',
					gridColumn: 'span 8'
				},
				vertical: {
					width: `calc(${width} * 6 + var(--application-global-col-gap) * 5)`,
					height: `calc(${height} * 8 + var(--application-global-row-gap) * 7)`,
					gridRow: 'span 8',
					gridColumn: 'span 6'
				}
			},
			square: {
				horizontal: {
					width: `calc(${width} * 6 + var(--application-global-col-gap) * 5)`,
					height: `calc(${height} * 6 + var(--application-global-row-gap) * 5)`,
					gridRow: 'span 6',
					gridColumn: 'span 6'
				},
				vertical: {
					width: `calc(${width} * 6 + var(--application-global-col-gap) * 5)`,
					height: `calc(${height} * 6 + var(--application-global-row-gap) * 5)`,
					gridRow: 'span 6',
					gridColumn: 'span 6'
				}
			}
		},
		ultra: {
			circle: {
				horizontal: {
					width: `calc(${width} * 7 + var(--application-global-col-gap) * 6)`,
					height: `calc(${height} * 7 + var(--application-global-row-gap) * 6)`,
					gridRow: 'span 7',
					gridColumn: 'span 7'
				},
				vertical: {
					width: `calc(${width} * 7 + var(--application-global-col-gap) * 6)`,
					height: `calc(${height} * 7 + var(--application-global-row-gap) * 6)`,
					gridRow: 'span 7',
					gridColumn: 'span 7'
				}
			},
			rectangle: {
				horizontal: {
					width: `calc(${width} * 9 + var(--application-global-col-gap) * 8)`,
					height: `calc(${height} * 7 + var(--application-global-row-gap) * 6)`,
					gridRow: 'span 7',
					gridColumn: 'span 9'
				},
				vertical: {
					width: `calc(${width} * 7 + var(--application-global-col-gap) * 6)`,
					height: `calc(${height} * 9 + var(--application-global-row-gap) * 8)`,
					gridRow: 'span 9',
					gridColumn: 'span 7'
				}
			},
			square: {
				horizontal: {
					width: `calc(${width} * 7 + var(--application-global-col-gap) * 6)`,
					height: `calc(${height} * 7 + var(--application-global-row-gap) * 6)`,
					gridRow: 'span 7',
					gridColumn: 'span 7'
				},
				vertical: {
					width: `calc(${width} * 7 + var(--application-global-col-gap) * 6)`,
					height: `calc(${height} * 7 + var(--application-global-row-gap) * 6)`,
					gridRow: 'span 7',
					gridColumn: 'span 7'
				}
			}
		}
	}

	return componentStyle[size][shape][direction]
}

interface MirrorOptions {
	mirrorID: string | null
}

function useMirror(options?: MirrorOptions) {
	const MIRROR_ID = options?.mirrorID ?? window.crypto.randomUUID()

	const MIRRORS: readonly Mirror[] = Array.from({ length: 1 }).map(function () {
		const mirror: Mirror = {
			id: MIRROR_ID,
			name: '镜像-01',
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
			name: value.label,
			index: 1,
			width: '60px',
			// shape: 'circle',
			shape: 'square',
			// shape: 'rectangle',
			round: '12px',
			height: '60px',
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

export { useMirror, useSettings }
