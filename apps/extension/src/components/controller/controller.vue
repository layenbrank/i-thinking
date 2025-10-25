<script setup lang="ts">
import { resize } from '@desktop-app/core/directives'
import AppMenu from '../app-menu/app-menu.vue'
// import AppDrawer from '../app-settings/app-settings.vue'
import { useApplicationStore } from '@/stores/application.ts'
import Sortable from 'sortablejs'

import { appReflect, contextmenuReflect, sizes } from './controller.tsx'

defineOptions({
	name: 'app-controller',
	directives: {
		resize
	}
})

const store = useApplicationStore()

const contextmenuRef = useTemplateRef('contextmenuRef')
const controllerRef = useTemplateRef('controllerRef')

const contextmenuVisible = ref(false)

const activeMenuKey = ref<ContextMenuKeys | null>(null)

const contextmenuRect = reactive({
	x: innerWidth - 200,
	y: 200,
	width: 0,
	height: 0
})

const contextmenuMap: Readonly<ContextMenuMap> = {
	'update-app'() {
		// void
	},
	'update-size'() {
		if (!store.applications) return
		for (const application of store.applications) {
			if (application.id !== store.activeApp?.id) continue
			const size = sizes[Math.round(Math.random() * sizes.length)]
			if (!size) continue
			application.size = size
		}
	},
	'update-wallpaper'() {
		// void
	},
	'update-backup'() {
		// void
	},
	'update-settings'() {
		store.settingsVisible = true
	}
}

const menuOptions = computed(function () {
	const active = store.applications?.find(function (app) {
		return app.id === store.activeApp?.id
	})

	// console.log('active', active)

	if (!active) return []

	return contextmenuReflect[active.component]()
})

function updateActiveKey(value: ContextMenuOptions) {
	activeMenuKey.value = value.key

	contextmenuMap[value.key]?.()
}

function handleController(e: MouseEvent) {
	const target = e.target as HTMLElement
	const appElement = target.closest<HTMLElement>('.application')

	// console.log('appElement', appElement)

	if (!store.settingsVisible) return
	if (!appElement?.dataset?.id) return
	store.activeApp =
		store.applications?.find(function (app) {
			return app.id === appElement.dataset.id
		}) ?? null
}

function openContextMenu(e: MouseEvent) {
	if (store.settingsVisible) return

	const target = e.target as HTMLElement
	const appElement = target.closest<HTMLElement>('.application')

	const contextmenu = contextmenuRef.value?.$el as HTMLElement

	setTimeout(function () {
		if (!contextmenu) return
		contextmenuRect.width = contextmenu.clientWidth
		contextmenuRect.height = contextmenu.clientHeight

		contextmenuRect.x = Math.min(e.clientX, innerWidth - contextmenuRect.width)
		contextmenuRect.y = Math.min(e.clientY, innerHeight - contextmenuRect.height)

		contextmenuVisible.value = true

		if (!appElement?.dataset?.id) return
		store.activeApp =
			store.applications?.find(function (app) {
				return app.id === appElement.dataset.id
			}) ?? null
	}, 60)
}

function closeContextMenu(_e: MouseEvent) {
	contextmenuVisible.value = false

	if (store.settingsVisible) return
	store.activeApp = null
}

function handleConfirm(value: any) {
	console.log('handleConfirm', value)
	if (!store.activeApp) return
	void store.toUpdate(store.activeApp.id, {
		...toRaw(store.activeApp),
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

function sortableHandler() {
	if (!controllerRef.value) return

	Sortable.create(controllerRef.value, {
		animation: 600,
		dataIdAttr: 'data-id',
		store: {
			set(sortable) {
				const toArray = sortable.toArray()
				const applications: Application[] = []

				for (let i = 0; i < toArray.length; i++) {
					const ID = toArray[i]

					if (!store.applications) return

					for (let application of store.applications) {
						application = toRaw(application)
						if (!application) continue
						if (application.id !== ID) continue
						applications.push({ ...application, sort: i })
					}
				}
				console.log('applications', applications)
				void store.updateApplications(applications)
			},
			get(sortable) {
				const toArray = store.applications?.map((application) => application.id)

				return toArray ?? []
			}
		}
	})
}

onMounted(function () {
	sortableHandler()

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
		@contextmenu.stop.prevent="openContextMenu"
		ref="controllerRef"
		class="controller"
	>
		<transition-group name="application-fade">
			<template v-for="application in store.applications" :key="application.id">
				<component
					:application="application"
					:is="appReflect[application.component]?.()"
					:settings-visible="store.settingsVisible"
					:data-id="application.id"
					:class="['application']"
				/>
			</template>
		</transition-group>

		<app-settings
			:title="null"
			:mask="false"
			placement="right"
			:closable="true"
			@update:confirm="handleConfirm"
			:get-container="handleTelePort"
			:application="store.activeApp"
			v-model:open="store.settingsVisible"
		/>

		<teleport to="body">
			<app-menu
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
						'is-active': store.activeApp && contextmenuVisible
					}
				]"
			/>
		</teleport>
	</div>
</template>

<style lang="scss" scoped>
.controller {
	display: grid;
	padding: 20px;
	margin: 0 auto;
	justify-content: center;
	grid-auto-flow: row dense;

	outline: none;
	scrollbar-width: none;
	row-gap: var(--app-global-row-gap, 30px);
	column-gap: var(--app-global-col-gap, 30px);
	grid-template-rows: repeat(auto-fill, var(--app-global-height, 60px));
	grid-template-columns: repeat(auto-fill, var(--app-global-width, 60px));

	transition:
		width 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
		height 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
		row-gap 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
		column-gap 300ms cubic-bezier(0.165, 0.84, 0.44, 1);

	:deep(:where(.application)) {
		@apply relative cursor-pointer text-center;

		transition:
			box-shadow 300ms,
			width 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
			height 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
			grid-row 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
			grid-column 300ms cubic-bezier(0.165, 0.84, 0.44, 1);

		& > :where(div:is([class*='-marker '], [class$='-marker'])) {
			@apply w-full h-full transition-all;
		}
		// & > :where(div:is([class*=' app-'], [class^='app-']):is([class*='-icon '], [class$='-icon'])) {
		// 	@apply w-full h-full transition-all;
		// }

		& > :where(span.app-name) {
			@apply block truncate w-full mt-1;
			color: var(--app-global-text-color);
			font-size: var(--app-global-text-size);
		}

		& > :where(.app-trash-icon) {
			@apply w-5 h-5 absolute -top-[8px] -right-[8px] items-center justify-center bg-[#00000033] rounded-full p-[5px] transition-[background];
			@apply hidden;

			&:hover {
				@apply bg-[#d83030];
			}
		}
	}

	.application {
		&-fade-move,
		&-fade-enter-active,
		&-fade-leave-active {
			transition:
				opacity 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
				grid-row 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
				grid-column 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
				transform 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
				width 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
				height 300ms cubic-bezier(0.165, 0.84, 0.44, 1);
		}

		&-fade-enter-from,
		&-fade-leave-to {
			opacity: 0;
			transform: scale(0);
		}
		/* 处理列表重排动画 */
		&-fade-move {
			transition: transform 300ms cubic-bezier(0.165, 0.84, 0.44, 1);
		}
	}
}
</style>
