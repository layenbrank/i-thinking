<script setup lang="tsx">
import { useAppSettings } from '@/hooks/app-settings'
import { useDraggable, useMagicKeys, whenever } from '@vueuse/core'
import AppIcon from './app-settings-icon.vue'
import ApplicationWindow from './app-settings-window.vue'

defineOptions({
	name: 'app-settings'
})

const props = withDefaults(
	defineProps<{
		application?: Application
		settingsVisible?: boolean
	}>(),
	{
		application() {
			return {
				id: '0',
				width: '60px',
				height: '60px',
				app: 'app-settings',
				round: '12px',
				size: 'medium',
				slideID: '0',
				sort: 0,
				name: 'example',
				direction: 'horizontal',
				shape: 'square',
				backgroundColor: '#ffffff4d',
				backgroundImage: null,
				textSize: '13px',
				textColor: '#ffffff',
				description: '书签',
				downloadCount: 1000
			}
		}
	}
)

const visible = ref(false)
const fullscreen = ref(false)

const { Escape } = useMagicKeys({
	onEventFired(e) {
		if (e.key === 'Escape') visible.value = false
	}
})

const mini = computed(() => props.application.size === 'mini')
const small = computed(() => props.application.size === 'small')
const medium = computed(() => props.application.size === 'medium')
const large = computed(() => props.application.size === 'large')
const huge = computed(() => props.application.size === 'huge')
const massive = computed(() => props.application.size === 'massive')
const ultra = computed(() => props.application.size === 'ultra')
const circle = computed(() => props.application.shape === 'circle')
const rectangle = computed(() => props.application.shape === 'rectangle')
const square = computed(() => props.application.shape === 'square')
const horizontal = computed(() => props.application.direction === 'horizontal')
const vertical = computed(() => props.application.direction === 'vertical')
const round = computed(() => props.application.round ?? 'var(--app-global-round)')
const background = computed(() => {
	if (props.application.backgroundImage) {
		return `url(${props.application.backgroundImage}) no-repeat center / cover`
	} else if (props.application.backgroundColor) return props.application.backgroundColor
	else return '#ffffff'
})

const { appStyle } = useAppSettings({
	width: computed(() => props.application.width ?? 'var(--app-global-width)'),
	height: computed(() => props.application.height ?? 'var(--app-global-height)'),
	mini,
	small,
	medium,
	large,
	huge,
	massive,
	ultra,
	circle,
	rectangle,
	square,
	horizontal,
	vertical
})

whenever(Escape, function () {
	visible.value = false
})

function updateVisible(value: boolean) {
	visible.value = value
}

function updateFullScreen(value: boolean) {
	fullscreen.value = value
}

function handleAppWindow() {
	visible.value = true
}
</script>

<template>
	<div
		:style="{
			'--app-round': round,
			'--app-size-width': appStyle.width,
			'--app-size-height': appStyle.height,
			'--app-grid-row': appStyle.gridRow,
			'--app-grid-column': appStyle.gridColumn,
			'--app-background': background
		}"
		:data-id="application.id"
		:class="['app-settings', application.size, application.shape, application.direction]"
	>
		<a-modal
			width="80%"
			:icon="null"
			:title="null"
			:mask="false"
			:footer="null"
			:centered="true"
			:mask-closable="false"
			:open="visible"
			:destroy-on-close="true"
			@update:open="updateVisible"
			:style="{
				transformOrigin: 'center'
			}"
			class="application-window settings-window"
		>
			<application-window />
		</a-modal>
		<app-icon
			:mini="mini"
			:small="small"
			:medium="medium"
			:large="large"
			:huge="huge"
			:massive="massive"
			:ultra="ultra"
			:circle="circle"
			:rectangle="rectangle"
			:square="square"
			:horizontal="horizontal"
			:vertical="vertical"
			:url="application.url"
			:icon="application.icon"
			:size="application.size"
			:shape="application.shape"
			:direction="application.direction"
			@click="handleAppWindow"
		/>
		<span class="app-name">{{ application.name }}</span>
		<i-local:close class="app-trash-icon" />
	</div>
</template>

<style lang="scss" scoped>
.app-settings {
	width: var(--app-size-width);
	height: var(--app-size-height);
	grid-row: var(--app-grid-row);
	grid-column: var(--app-grid-column);
	border-radius: var(--app-round);
}
</style>
<style lang="scss">
.application-window.settings-window {
	div[tabindex='0'][style='outline: none;'] {
		@apply w-full h-full;
	}

	.ant-modal-content,
	.ant-modal-body,
	.ant-modal-confirm-body-wrapper,
	.ant-modal-confirm-body,
	.ant-modal-confirm-content {
		@apply w-full h-full;
	}

	.ant-modal-content {
		@apply bg-transparent;
	}

	.ant-modal-body {
		@apply bg-white rounded-lg;
	}
}
</style>
