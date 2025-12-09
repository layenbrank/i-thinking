<script setup lang="ts">
import Contextmenu from '@/components/contextmenu/contextmenu.vue'
import { useMirror } from '@/hooks/mirror'
import { useMirrorStore, type ToUpdateApplication } from '@/stores/mirror.ts'
import { resize } from '@i-thinking/core/directives'
import Sortable from 'sortablejs'

defineOptions({
	name: 'controller',
	directives: {
		resize
	}
})

const store = useMirrorStore()
const { APPLICATION, CONTEXTMENU, MENUOPTIONS } = useMirror()

const controllerRef = useTemplateRef('controllerRef')
const contextmenuRef = useTemplateRef('contextmenuRef')

const visible = ref(false)
const sortable = ref<Sortable | null>(null)
const activeKey = ref<ContextMenuKeys | null>(null)

const contextDOMRect = reactive({
	x: innerWidth - 200,
	y: 200,
	width: 0,
	height: 0
})

const contextmenuMap: Readonly<ContextMenuMap> = {
	'update-app'() {
		// void
	},
	'remove-app'() {
		console.log('[Remove application]', store.application)
		void store.toRemoveApplication([store.application?.id ?? ''])
	},
	'update-wallpaper'() {
		// void
	},
	'update-backup'() {
		// void
	},
	'update-settings'() {
		// store.settingsVisible = true
	}
}

const options = computed(function () {
	const application = store.applications?.find(function (application) {
		return application.id === store.application?.id
	})
	if (!application) return []
	const { component } = application
	const handler = CONTEXTMENU[component]
	return handler?.() ?? MENUOPTIONS
})

function updateActiveKey(value: ContextMenuOptions) {
	activeKey.value = value.key

	contextmenuMap[value.key]?.()
}

function handleController(e: MouseEvent) {
	const target = e.target as HTMLElement
	const closest = target.closest<HTMLElement>('.application')

	// if (!store.settingsVisible) return
	if (!closest?.dataset?.id) return

	const application = store.applications?.find(function (app) {
		return app.id === closest.dataset.id
	})

	store.application = application ?? null
}

function mountContext(e: MouseEvent) {
	// if (store.settingsVisible) return

	const target = e.target as HTMLElement
	const closest = target.closest<HTMLElement>('.application')

	const contextmenu = contextmenuRef.value?.$el as HTMLElement

	setTimeout(function () {
		if (!contextmenu) return

		contextDOMRect.width = contextmenu.clientWidth
		contextDOMRect.height = contextmenu.clientHeight

		contextDOMRect.x = Math.min(e.clientX, innerWidth - contextDOMRect.width)
		contextDOMRect.y = Math.min(e.clientY, innerHeight - contextDOMRect.height)

		visible.value = true

		if (!closest?.dataset?.id) return

		const application = store.applications?.find(function (app) {
			return app.id === closest.dataset.id
		})

		store.application = application ?? null
	}, 60)
}

function destroyContext() {
	visible.value = false
	setTimeout(() => (store.application = null), 60)
}

function handleResize(DOMRect: DOMRect) {
	contextDOMRect.width = DOMRect.width
	contextDOMRect.height = DOMRect.height
}

function handleDropZone(event: DragEvent) {
	const target = event.target as HTMLElement
	if (!target) return

	const closest = target.closest<HTMLElement>('.application')
	if (!closest) return

	const dataTransferID = event.dataTransfer?.getData('text/plain')
	if (!dataTransferID) return

	const application = store.applications?.find(function (application) {
		return application.id === dataTransferID
	})

	console.log('[DropZone dataTransferID]', dataTransferID, '\n[DropZone application]', application)
}

function initialize() {
	if (!controllerRef.value) return
	const controller = controllerRef.value

	sortable.value = new Sortable(controller, {
		// sort: true,
		animation: 600,
		easing: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
		dataIdAttr: 'data-id',
		draggable: '.sortable-draggable', // 允许拖拽的项目类名
		filter: '.sortable-ignore', // 过滤器，不需要进行拖动的元素
		// handle: '.sortable-handle',
		dragClass: 'sortable-dragger', // 正在被拖拽中的css类名
		ghostClass: 'sortable-ghost', // drop placeholder的css类名
		chosenClass: 'sortable-chosen', // 被选中项的css 类名
		swapClass: 'sortable-swap', // 交换时的css类名
		forceFallback: false, // 忽略 HTML5拖拽行为，强制回调进行
		// swap: true,
		// swapThreshold: 0.65,
		swapThreshold: 0.05,
		invertSwap: true,

		// invertedSwapThreshold: 1,
		store: {
			set(sortable) {
				const toArray = sortable.toArray()
				const updates: ToUpdateApplication[] = []

				for (let i = 0; i < toArray.length; i++) {
					const ID = toArray[i]

					if (!store.applications) return

					for (let application of store.applications) {
						application = toRaw(application)
						if (!application) continue
						if (application.id !== ID) continue
						updates.push({ key: application.id, changes: { index: i } })
					}
				}
				console.log('[Sortable applications]', updates)
				void store.toUpdateApplication(updates)
			},
			get(sortable) {
				const toArray = store.applications?.map(function (application) {
					return application.id
				})

				return toArray ?? []
			}
		},
		group: {
			name: 'application-collection',
			pull(to, from, dragEl, event) {
				return true
			},
			put(to, from, dragEl, event) {
				return true
			},
			checkPull(sortable, activeSortable, dragEl, event) {
				return true
			},
			checkPut(sortable, activeSortable, dragEl, event) {
				return true
			}
		},
		setData(dataTransfer, draggedElement) {
			dataTransfer.setData('text/plain', draggedElement.dataset.id ?? '')
		}
	})
}

onMounted(function () {
	initialize()
	window.addEventListener('click', destroyContext, true)
	window.addEventListener('contextmenu', destroyContext, true)
})

onUnmounted(function () {
	sortable.value?.destroy()
	window.removeEventListener('click', destroyContext)
	window.removeEventListener('contextmenu', destroyContext)
})
</script>

<template>
	<div
		@dragover.prevent
		@drop="handleDropZone"
		@click.capture="handleController"
		@contextmenu.stop.prevent="mountContext"
		ref="controllerRef"
		class="controller mini"
	>
		<TransitionGroup name="application-fade">
			<template v-for="application in store.applications" :key="application.id">
				<component
					:application="application"
					:is="APPLICATION[application.component]"
					:data-id="application.id"
					class="application sortable-draggable sortable-ghost sortable-chosen sortable-swap application-collection"
				/>
			</template>
		</TransitionGroup>
		<Teleport to="body">
			<Contextmenu
				ref="contextmenuRef"
				:x="contextDOMRect.x"
				:y="contextDOMRect.y"
				v-resize="handleResize"
				v-model:visible="visible"
				:options="options ?? []"
				@update:active-key="updateActiveKey"
				@contextmenu.prevent="mountContext"
				:class="[
					{
						'is-active': store.application && visible && options?.length
					}
				]"
			/>
		</Teleport>
	</div>
</template>

<style lang="scss" scoped>
@use '@/styles/application.scss' as *;

.controller {
	@extend %controller;
}
</style>
