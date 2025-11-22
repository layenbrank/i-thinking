<script setup lang="ts">
import { resize } from '@desktop-app/core/directives'
import AppMenu from '../app-menu/app-menu.vue'
// import AppDrawer from '../app-settings/app-settings.vue'
import { useApplicationStore } from '@/stores/application.ts'
import Sortable from 'sortablejs'

import { useApplication } from '@/hooks/application.ts'

defineOptions({
	name: 'app-controller',
	directives: {
		resize
	}
})

const store = useApplicationStore()
const { APPLICATION, CONTEXTMENU, SIZES } = useApplication()

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
			const size = SIZES[Math.round(Math.random() * SIZES.length)]
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

	return CONTEXTMENU[active.component]?.()
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
					:is="APPLICATION[application.component]"
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
				:options="menuOptions ?? []"
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
@use '@/styles/application.scss' as *;

.controller {
	@extend %controller;
}
</style>
