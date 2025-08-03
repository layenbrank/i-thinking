<script setup lang="ts">
import { resize } from '@desktop-app/core/directives'
import AppMenu from '../app-menu/app-menu.vue'
// import AppDrawer from '../app-settings/app-settings.vue'
import { useAppStore } from '@/stores/application-store.ts'
import Sortable from 'sortablejs'

import { appReflect, contextmenuReflect, sizes } from './app-controller.tsx'

defineOptions({
	name: 'app-controller',
	directives: {
		resize
	}
})

const appStore = useAppStore()

const contextmenuRef = useTemplateRef('contextmenuRef')
const appControllerRef = useTemplateRef('appControllerRef')

// const activeApp = ref<SlideApp | null>(null)

const contextmenuVisible = ref(false)

const activeMenuKey = ref<ContextMenuKeys | null>(null)

// const settingsVisible = ref(false)

const contextmenuRect = reactive({
	x: innerWidth - 200,
	y: 200,
	width: 0,
	height: 0
})

const contextmenuMap: Readonly<ContextMenuMap> = {
	'update-app'() {},
	'update-size'() {
		for (const index in appStore.applications) {
			if (!Object.prototype.hasOwnProperty.call(appStore.applications, index)) return

			const app = appStore.applications[Number(index)]

			if (app.id !== appStore.activeApp?.id) continue
			app.size = sizes[Math.round(Math.random() * sizes.length)]
		}
	},
	'update-wallpaper'() {},
	'update-backup'() {},
	'update-settings'() {
		appStore.settingsVisible = true
	}
}

const menuOptions = computed(() => {
	const active = appStore.applications?.find((app) => app.id === appStore.activeApp?.id)

	console.log('active', active)

	if (!active) return []

	return contextmenuReflect[active.app]()
})

function updateActiveKey(value: ContextMenuOptions) {
	activeMenuKey.value = value.key

	contextmenuMap[value.key]?.()
}

function handleController(e: MouseEvent) {
	const target = e.target as HTMLElement
	const application = target.closest('.slide-app') as HTMLElement

	console.log('application', application)

	if (!appStore.settingsVisible) return
	if (!application?.dataset?.id) return
	appStore.activeApp =
		appStore.applications?.find((app) => app.id === application.dataset.id) ?? null
}

function openContextMenu(e: MouseEvent) {
	e.preventDefault()
	e.stopPropagation()

	if (appStore.settingsVisible) return

	const target = e.target as HTMLElement
	const application = target.closest('.slide-app') as HTMLElement

	const contextmenu = contextmenuRef.value?.$el as HTMLElement

	setTimeout(() => {
		if (!contextmenu) return
		contextmenuRect.width = contextmenu.clientWidth
		contextmenuRect.height = contextmenu.clientHeight

		contextmenuRect.x = Math.min(e.clientX, innerWidth - contextmenuRect.width)
		contextmenuRect.y = Math.min(e.clientY, innerHeight - contextmenuRect.height)

		contextmenuVisible.value = true

		if (!application?.dataset?.id) return
		appStore.activeApp =
			appStore.applications?.find((app) => app.id === application.dataset.id) ?? null
	}, 60)
}

function closeContextMenu(_e: MouseEvent) {
	contextmenuVisible.value = false

	if (appStore.settingsVisible) return
	appStore.activeApp = null
}

function handleConfirm(value: any) {
	console.log('handleConfirm', value)
	if (!appStore.activeApp) return
	appStore.updateApplication(appStore.activeApp.id, {
		...toRaw(appStore.activeApp),
		...toRaw(value)
	})
	// for (const index in slides.value) {
	//   if (!Object.prototype.hasOwnProperty.call(slides.value, index)) return

	//   if (slides.value[Number(index)].id !== activeSlideApp.value?.id) continue

	//   slides.value[Number(index)].size = value.size
	//   slides.value[Number(index)].shape = value.shape
	//   slides.value[Number(index)].direction = value.direction
	// }
}

function handleResize(DOMRect: DOMRect) {
	contextmenuRect.width = DOMRect.width
	contextmenuRect.height = DOMRect.height
}

function handleTelePort() {
	return document.body
}

function handleSortable() {
	if (!appControllerRef.value) return

	Sortable.create(appControllerRef.value, {
		animation: 600,
		dataIdAttr: 'data-id',
		store: {
			set(sortable) {
				const toArray = sortable.toArray()
				const applications: Application[] = []

				for (let i = 0; i < toArray.length; i++) {
					const ID = toArray[i]

					for (let j = 0; j < appStore.applications!.length; j++) {
						const application = toRaw(appStore.applications![j])
						if (application.id !== ID) continue
						applications.push({ ...application, sort: i })
					}
				}
				console.log('applications', applications)
				appStore.updateApplications(applications)
			},
			get(sortable) {
				const toArray = appStore.applications?.map((application) => application.id)

				return toArray ?? []
			}
		}
	})
}

onMounted(function () {
	handleSortable()

	window.addEventListener('click', closeContextMenu, true)
	window.addEventListener('contextmenu', closeContextMenu, true)
})

onUnmounted(function () {
	window.removeEventListener('click', closeContextMenu)
	window.removeEventListener('contextmenu', closeContextMenu)
})
</script>

<template>
	<div
		@click.capture="handleController"
		@contextmenu="openContextMenu"
		ref="appControllerRef"
		class="app-controller"
	>
		<TransitionGroup name="slide-app-fade">
			<template v-for="application in appStore.applications" :key="application.id">
				<component
					:application="application"
					:is="appReflect[application.app]?.()"
					:settings-visible="appStore.settingsVisible"
					:data-id="application.id"
					:class="['slide-app']"
				/>
			</template>
		</TransitionGroup>

		<AppSettings
			:application="appStore.activeApp"
			:title="null"
			:mask="false"
			placement="right"
			:closable="true"
			@update:confirm="handleConfirm"
			:slideApp="appStore.activeApp"
			v-model:open="appStore.settingsVisible"
			:get-container="handleTelePort"
		/>

		<Teleport to="body">
			<AppMenu
				v-resize="handleResize"
				ref="contextmenuRef"
				:x="contextmenuRect.x"
				:y="contextmenuRect.y"
				:options="menuOptions"
				v-model:visible="contextmenuVisible"
				@update:active-key="updateActiveKey"
				@contextmenu.prevent="openContextMenu"
				:class="[
					{
						'is-active': appStore.activeApp && contextmenuVisible
					}
				]"
			/>
		</Teleport>
	</div>
</template>

<style lang="scss" scoped>
.app-controller {
	@apply mx-auto grid justify-center p-5;
	@apply grid-flow-row-dense;

	outline: none;
	scrollbar-width: none;
	transition: all 500ms linear;
	row-gap: var(--app-global-row-gap, 30px);
	column-gap: var(--app-global-col-gap, 30px);
	grid-template-rows: repeat(auto-fill, var(--app-global-height, 60px));
	grid-template-columns: repeat(auto-fill, var(--app-global-width, 60px));

	:deep(:where(.slide-app)) {
		@apply relative cursor-pointer text-center;

		transition:
			box-shadow 300ms,
			width 300ms linear,
			height 300ms linear,
			grid-row 300ms linear,
			grid-column 300ms linear;

		& > :where(div:is([class*=' app-'], [class^='app-']):is([class*='-icon '], [class$='-icon'])) {
			@apply w-full h-full transition-all;
		}

		& > span.app-name {
			@apply block truncate w-full mt-1;
			font-size: var(--app-global-text-size);
			color: var(--app-global-text-color);
		}

		& > .app-trash-icon {
			@apply w-5 h-5 absolute -top-[8px] -right-[8px] items-center justify-center bg-[#00000033] rounded-full p-[5px] transition-[background];
			@apply hidden;

			&:hover {
				@apply bg-[#d83030];
			}
		}
	}

	.slide-app {
		&-fade-move,
		&-fade-enter-active,
		&-fade-leave-active {
			transition:
				opacity 600ms linear,
				grid-row 600ms linear,
				grid-column 600ms linear,
				transform 600ms linear,
				width 600ms linear,
				height 600ms linear;
		}

		&-fade-enter-from,
		&-fade-leave-to {
			opacity: 0;
			transform: scale(0);
		}
		/* 处理列表重排动画 */
		&-fade-move {
			transition: transform 600ms linear;
		}
	}
}
</style>
